import { Request, Response } from 'express';
import { AGENCY_SPECTRUM, BRAKES, QUOTAS, RISK_BANDS, TIER_POLICY, config } from '../config/config.js';
import { isOffline } from '../lib/llm.js';
import { analyzeInput, audit, getAuditLog, outputGate } from '../middleware/defensive.js';
import { permissionsFor, toolsForRole } from '../middleware/rbac.js';
import { sessionContext } from '../middleware/validate.js';
import { executeToolCall, resumeAgent, runAgent } from '../services/agent.service.js';
import { allApprovals, pendingApprovals } from '../services/approval.service.js';
import { ALL_TOOLS, describeRegistry, toWireDefinitions } from '../services/registry.service.js';
import type { Ledger, ToolCall } from '../types/agent.types.js';

/**
 * Chapter 06 §06.4 — the controller owns the HTTP lifecycle and NOTHING else.
 *
 * Notice how thin it is. It parses, validates, calls the engine, and maps the
 * result to a response. Its whole contribution to "intelligence" is one line:
 * `await runAgent(...)`. That is what makes it reviewable in thirty seconds.
 */

/** Chapter 04 §04.4 — the last 50 ledgers, so cost is observable at runtime. */
const recentRuns: { at: number; goal: string; ledger: Ledger; halted: string | null }[] = [];
const REMEMBERED_RUNS = 50;

/** Chapter 02 §02.1 / §02.2 — the six components, as this process implements them. */
const COMPONENTS = [
  { name: 'Model', file: 'lib/llm.ts', owns: 'interpretation · selection · synthesis' },
  { name: 'Tools', file: 'services/registry.service.ts + workspace.service.ts', owns: 'capability' },
  { name: 'Memory', file: 'services/approval.service.ts (session store)', owns: 'durable state across pauses' },
  { name: 'State', file: 'types/agent.types.ts (AgentStateRecord)', owns: 'messages · lastAction · history' },
  { name: 'Orchestrator', file: 'services/agent.service.ts', owns: 'the loop, brakes, trace, ledger' },
  { name: 'Guardrails', file: 'lib/security.ts + middleware/rbac.ts + middleware/defensive.ts', owns: 'permission · containment · injection' },
];

export const getHealth = (_req: Request, res: Response): void => {
  const level = config.AGENCY_LEVEL;
  res.json({
    status: 'ok',
    mode: isOffline() ? 'offline (deterministic stub model)' : 'live provider',
    model: config.AI_MODEL,
    provider: config.AI_PROVIDER,
    /** Chapter 01 §01.2 — where this process sits on the agency spectrum. */
    agency: { level, ...AGENCY_SPECTRUM[level as 1 | 2 | 3 | 4] },
    /** Chapter 02 §02.1 — the six-component model, made concrete. */
    components: COMPONENTS,
    brakes: BRAKES,
    quotas: QUOTAS,
    tierPolicy: TIER_POLICY,
    riskBands: RISK_BANDS,
    registry: describeRegistry(),
    pendingApprovals: pendingApprovals().length,
    endpoints: [
      'GET  /api/health',
      'GET  /api/tools',
      'POST /api/agent/run',
      'POST /api/workspace/write',
      'GET  /api/workspace/files',
      'GET  /api/approvals',
      'POST /api/agent/resume',
      'POST /api/guard/scan',
      'GET  /api/audit',
    ],
  });
};

/**
 * Chapter 08 §08.2.2 — the registry, AS THIS ROLE SEES IT.
 *
 * This endpoint is the chapter's most important demonstration. Ask for it as a
 * `learner` and `refundCustomer` is absent — not forbidden, ABSENT. The capability
 * was never exposed, so there is nothing to jailbreak toward.
 */
export const getTools = (req: Request, res: Response): void => {
  const ctx = sessionContext(req);
  const allowed = toolsForRole(ALL_TOOLS, ctx.role);
  const withheld = ALL_TOOLS.filter((tool) => !allowed.includes(tool));

  res.json({
    role: ctx.role,
    permissions: permissionsFor(ctx.role),
    note: 'The model only ever receives `tools`. Withheld tools are not denied at call time — they are never offered.',
    tools: describeRegistry(allowed),
    withheldFromThisRole: describeRegistry(withheld).map((tool) => tool.name),
    wire: toWireDefinitions(allowed),
  });
};

/**
 * Chapter 08 §08.7 — the INPUT GATE, before the model is ever involved.
 *
 * The wrapper evaluates the ACTUAL request, not the justification attached to it.
 * A claimed reason ("I am the admin", "for educational purposes") does not
 * establish authorisation, so a claimed reason is itself a signal.
 */
const inputGate = (res: Response, input: string, actor: string, tenantId: string): boolean => {
  const risk = analyzeInput(input, actor);

  if (risk.band === 'block') {
    audit({
      type: 'inputBlocked',
      actor,
      tenantId,
      detail: `score ${risk.score}: ${risk.reasons.join('; ')}`,
      severity: 'critical',
    });
    res.status(403).json({
      error: 'Blocked by the input gate',
      note: 'This is one signal, not a security layer — it is never the authorization mechanism.',
      risk,
    });
    return false;
  }

  return true;
};

/**
 * Chapter 03 §03.5 / chapter 06 §06.5 — the loop, end to end.
 *
 * The response is deliberately the WHOLE run: the answer, the named terminal state,
 * the trace (one row per hop, with the raw arguments and the tier) and the ledger.
 * That is what lets you point at the exact message that caused each hop.
 */
export const postAgentRun = async (req: Request, res: Response): Promise<void> => {
  const ctx = sessionContext(req);
  const { goal, maxSteps, timeoutMs, cancelAfterMs } = req.body as {
    goal: string;
    maxSteps?: number;
    timeoutMs?: number;
    cancelAfterMs?: number;
  };

  if (!inputGate(res, goal, ctx.userId, ctx.tenantId)) return;

  const run = await runAgent({ goal, ctx, maxSteps, timeoutMs, cancelAfterMs });
  recentRuns.unshift({ at: Date.now(), goal, ledger: run.ledger, halted: run.halted });
  if (recentRuns.length > REMEMBERED_RUNS) recentRuns.pop();

  // Chapter 08 §08.7.4 — the OUTPUT GATE. The model's words do not go straight
  // to the user; secrets and PII are redacted on the way out.
  const verdict = outputGate(run.answer);
  if (!verdict.allowed) {
    audit({
      type: 'outputBlocked',
      actor: ctx.userId,
      tenantId: ctx.tenantId,
      detail: verdict.reason ?? 'blocked',
      severity: 'critical',
    });
  }

  res.json({
    answer: verdict.allowed ? verdict.redacted : '[blocked by the output gate]',
    outputGate: verdict.reason ?? null,
    state: run.state,
    halted: run.halted,
    /** Chapter 07 §07.4.1 step 3 — a pending run returns a ticket, not a hang. */
    pendingApproval: run.pendingApproval,
    sessionId: run.sessionId,
    toolsOffered: run.toolsOffered,
    trace: run.trace,
    ledger: run.ledger,
  });
};

/**
 * Chapter 05 §05.4 — the sandbox, exercised directly.
 *
 * Every path goes through `executeToolCall`, which goes through `safePath`. Try
 * `../../src/server.ts` here; the denial is the whole point of the chapter.
 */
export const postWorkspaceWrite = async (req: Request, res: Response): Promise<void> => {
  const ctx = sessionContext(req);
  const { path: filePath, content, owner } = req.body as { path: string; content: string; owner?: string };

  const call: ToolCall = {
    id: `call_ws_${Date.now()}`,
    name: 'writeFile',
    arguments: JSON.stringify(owner ? { path: filePath, content, owner } : { path: filePath, content }),
  };

  const allowed = toolsForRole(ALL_TOOLS, ctx.role);
  const outcome = await executeToolCall(call, ctx, allowed, 'direct');

  res.status(outcome.trace.outcome === 'ok' ? 200 : 403).json({
    path: filePath,
    outcome: outcome.trace.outcome,
    code: outcome.trace.code,
    latencyMs: outcome.trace.latencyMs,
    /** The exact string that would be sent back as the `tool` message. */
    content: outcome.trace.content,
    parsed: JSON.parse(outcome.trace.content),
  });
};

/** Chapter 06 §06.3 — `listFiles`: cheap, high-value perception. */
export const getWorkspaceFiles = async (req: Request, res: Response): Promise<void> => {
  const ctx = sessionContext(req);
  const call: ToolCall = {
    id: `call_ls_${Date.now()}`,
    name: 'listFiles',
    arguments: JSON.stringify({ path: (req.query.path as string) ?? '.' }),
  };

  const allowed = toolsForRole(ALL_TOOLS, ctx.role);
  const outcome = await executeToolCall(call, ctx, allowed, 'direct');
  res.status(outcome.trace.outcome === 'ok' ? 200 : 403).json(JSON.parse(outcome.trace.content));
};

/** Chapter 07 §07.5 — the queue a human reviews. */
export const getApprovals = (_req: Request, res: Response): void => {
  res.json({ pending: pendingApprovals(), all: allApprovals() });
};

/**
 * Chapter 07 §07.5 — the resumption webhook.
 *
 * A rejection returns 200 with a resumable report, not a 4xx: the human's "no" is a
 * legitimate outcome, and the agent resumes to explain it (§07.4.1 note).
 */
export const postResume = async (req: Request, res: Response): Promise<void> => {
  const ctx = sessionContext(req);
  const { approvalId, decision, reason, approverId } = req.body as {
    approvalId: string;
    decision: 'approve' | 'reject';
    reason?: string;
    approverId: string;
  };

  const outcome = await resumeAgent({ approvalId, decision, approverId, reason, ctx });

  if (!outcome.ok) {
    res.status(outcome.error === 'NOT_FOUND' ? 404 : 409).json({ error: outcome.error, approval: outcome.approval });
    return;
  }

  res.json({
    status: 'resumed_and_completed',
    approval: outcome.approval,
    resolution: outcome.resolution,
    answer: outcome.run.answer,
    state: outcome.run.state,
    halted: outcome.run.halted,
    ledger: outcome.run.ledger,
  });
};

/** Chapter 08 §08.7.3 — the wrapper's verdicts, observable directly. */
export const postGuardScan = (req: Request, res: Response): void => {
  const ctx = sessionContext(req);
  const { input, response } = req.body as { input: string; response?: string };
  const risk = analyzeInput(input, ctx.userId);

  res.json({
    input: {
      risk,
      note: 'Risk scoring, not a binary verdict — 0-29 allow · 30-59 extra checks · 60-79 restrict · 80-100 block.',
    },
    output: response !== undefined ? outputGate(response) : null,
  });
};

/** Chapter 08 §08.9 — the audit log a SIEM would ingest. */
export const getAudit = (_req: Request, res: Response): void => {
  res.json({ count: getAuditLog().length, events: getAuditLog() });
};


