import { Request, Response } from 'express';
import { BRAKES, TOOL_POLICY, config } from '../config/config.js';
import { executeSafely, runAgent } from '../services/agent.service.js';
import { routingFixtures, runRoutingEval } from '../services/eval.service.js';
import { decideApproval, describeRegistry, getApproval, pendingApprovals, toWireDefinitions } from '../services/registry.service.js';
import { isOffline } from '../lib/llm.js';
import { sessionContext, toToolChoice } from '../middleware/validate.js';
import type { Ledger, ToolCall } from '../types/agent.types.js';

/**
 * Chapter 05 §05.6.1 — the controller owns the HTTP lifecycle and nothing else.
 * It assembles a request, calls the engine, and reports what happened — including
 * the trace and the ledger, which is what makes the lecture's gate satisfiable.
 */

/** Chapter 08 §08.6.3 — the last 50 ledgers, so cost is observable at runtime. */
const recentRuns: { at: number; goal: string; ledger: Ledger; halted: string | null }[] = [];
const REMEMBERED_RUNS = 50;

/** Chapter 02 §02.6 / chapter 08 §08.8 — the wiring, the registry and the brakes. */
export const getHealth = (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    mode: isOffline() ? 'offline (deterministic stub model)' : 'live provider',
    model: config.AI_MODEL,
    provider: config.AI_PROVIDER,
    toolChoice: config.TOOL_CHOICE,
    brakes: BRAKES,
    toolPolicy: TOOL_POLICY,
    registry: describeRegistry(),
    pendingApprovals: pendingApprovals().length,
    endpoints: [
      'GET  /api/health',
      'GET  /api/tools',
      'POST /api/tools/:name/call',
      'POST /api/agent/run',
      'POST /api/eval/routing',
      'GET  /api/ledger',
      'GET  /api/approvals',
      'POST /api/approvals/:approvalId',
    ],
  });
};

/** Chapter 02 §02.2 — exactly what the model is told about your code. Nothing else leaves. */
export const getTools = (_req: Request, res: Response): void => {
  res.json({
    note: 'This is the ONLY thing the model sees: name, description and parameters.',
    tools: toWireDefinitions(),
  });
};

/**
 * Chapter 03 §03.2 step 3, and chapter 06 §06.1 — one tool call, straight through
 * the same `executeSafely` boundary the loop uses.
 *
 * It never throws: a bad argument string, an unknown tool and a domain error all
 * come back as a result with `status: "error"` and a `code`.
 */
export const postToolCall = async (req: Request, res: Response): Promise<void> => {
  const name = String(req.params.name);
  const rawArguments = String((req.body as { arguments?: string }).arguments ?? '{}');
  const ctx = sessionContext(req);

  const call: ToolCall = { id: `call_direct_${Date.now()}`, name, arguments: rawArguments };
  const outcome = await executeSafely(call, ctx);

  res.json({
    tool: name,
    rawArguments,
    outcome: outcome.outcome,
    code: outcome.code,
    cached: outcome.cached,
    latencyMs: outcome.latencyMs,
    pendingApproval: outcome.pendingApproval,
    /** The exact string that would be sent back as the `tool` message. */
    content: outcome.content,
    parsed: JSON.parse(outcome.content),
  });
};

/**
 * Chapter 05 §05.6 — the loop, end to end.
 *
 * The response is deliberately the WHOLE run: the answer, the trace (one row per
 * hop, with the raw arguments) and the ledger. That is what lets you point at the
 * exact message that caused each hop — the lecture's completion gate.
 */
export const postAgentRun = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { goal: string; maxSteps?: number; timeoutMs?: number; toolChoice: string };
  const ctx = sessionContext(req);

  const run = await runAgent(body.goal, ctx, {
    maxSteps: body.maxSteps,
    timeoutMs: body.timeoutMs,
    toolChoice: toToolChoice(body.toolChoice),
  });

  recentRuns.unshift({ at: Date.now(), goal: body.goal, ledger: run.ledger, halted: run.halted });
  if (recentRuns.length > REMEMBERED_RUNS) recentRuns.pop();

  res.json({
    goal: body.goal,
    answer: run.answer,
    steps: run.steps,
    halted: run.halted,
    pendingApproval: run.pendingApproval,
    trace: run.trace,
    ledger: run.ledger,
  });
};

/**
 * Chapter 07 §07.4 — tool selection as a measurable behaviour.
 *
 * Four metrics plus the confusion matrix. The `none` row is the one most teams
 * forget, and it is the one that catches over-calling.
 */
export const postRoutingEval = async (_req: Request, res: Response): Promise<void> => {
  const report = await runRoutingEval();
  res.json({ fixtures: routingFixtures.length, ...report });
};

/** Chapter 08 §08.6.3 — p50/p95 cost, halt reasons and the tool-time share. */
export const getLedger = (_req: Request, res: Response): void => {
  const runs = recentRuns.map((entry) => entry.ledger);
  const totals = runs.map((ledger) => ledger.totalInputTokens + ledger.totalOutputTokens);
  const sorted = [...totals].sort((a, b) => a - b);
  const percentile = (p: number): number => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0);

  const haltReasons: Record<string, number> = {};
  for (const entry of recentRuns) {
    const key = entry.halted ?? 'completed';
    haltReasons[key] = (haltReasons[key] ?? 0) + 1;
  }

  res.json({
    runs: runs.length,
    note: 'Input tokens grow super-linearly with hops: the whole history is re-sent every turn (chapter 08 §08.6.1).',
    avgSteps: runs.length ? runs.reduce((sum, ledger) => sum + ledger.steps, 0) / runs.length : 0,
    avgInputTokens: runs.length ? runs.reduce((sum, ledger) => sum + ledger.totalInputTokens, 0) / runs.length : 0,
    p50Tokens: percentile(0.5),
    p95Tokens: percentile(0.95),
    toolTimeMsTotal: runs.reduce((sum, ledger) => sum + ledger.toolTimeMs, 0),
    haltReasons,
    recent: recentRuns.slice(0, 10),
  });
};

/** Chapter 08 §08.5 — the queue a human reviews. */
export const getApprovals = (_req: Request, res: Response): void => {
  res.json({ pending: pendingApprovals() });
};

/**
 * Chapter 08 §08.5.2 — the four rules, in one handler.
 *
 * The gate lives in the RUNTIME: no approval record, no execution. The decision
 * binds to the exact arguments, it cannot cross tenants, and an approved call is
 * executed exactly once — with the approval id passed down to `executeSafely`.
 */
export const postApproval = async (req: Request, res: Response): Promise<void> => {
  const approvalId = String(req.params.approvalId);
  const { decision } = req.body as { decision: 'approve' | 'reject' };
  const ctx = sessionContext(req);

  const approval = getApproval(approvalId);
  if (!approval) {
    res.status(404).json({ error: 'Not Found', message: `No approval ${approvalId}.` });
    return;
  }
  if (approval.tenantId !== ctx.tenantId) {
    // Rule: an approval belongs to the tenant that requested it.
    res.status(403).json({ error: 'Forbidden', message: 'This approval belongs to another tenant.' });
    return;
  }

  const decided = decideApproval(approvalId, decision);
  if (!decided || decided.status !== 'approved') {
    res.json({ approval: decided ?? approval, execution: null });
    return;
  }

  // "Execute once": an approval that has already run REPLAYS its result instead of
  // applying the side effect a second time (chapter 04 §04.7.1 rule 1).
  if (decided.executedResult !== undefined) {
    res.json({
      approval: decided,
      execution: { outcome: 'ok', code: undefined, content: JSON.stringify(decided.executedResult), replayed: true },
    });
    return;
  }

  // Rule 3 + "execute once": the same tool, the SAME arguments, once.
  const call: ToolCall = { id: `call_${approvalId}`, name: decided.toolName, arguments: decided.rawArguments };
  const outcome = await executeSafely(call, ctx, approvalId);
  decided.executedResult = JSON.parse(outcome.content);

  res.json({
    approval: decided,
    execution: { outcome: outcome.outcome, code: outcome.code, content: outcome.content, latencyMs: outcome.latencyMs },
  });
};

