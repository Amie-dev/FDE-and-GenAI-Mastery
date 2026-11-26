import { BRAKES } from '../config/config.js';
import { modelStep, WEBSITE_BUILDER_SYSTEM_PROMPT } from '../lib/llm.js';
import { audit } from '../middleware/defensive.js';
import { authorizeTool, toolContextFor, toolsForRole } from '../middleware/rbac.js';
import type {
  AgentRun,
  AgentState,
  AgentStateRecord,
  AssistantMessage,
  HaltReason,
  Ledger,
  Message,
  PendingApproval,
  SessionContext,
  StepTrace,
  Tool,
  ToolCall,
  ToolCallTrace,
  ToolResult,
} from '../types/agent.types.js';
import {
  HITLPolicyEngine,
  createApproval,
  decideApproval,
  getApproval,
  loadSession,
  resolveToolExecution,
  saveSession,
} from './approval.service.js';
import { ALL_TOOLS, getTool, toWireDefinitions } from './registry.service.js';
import { initWorkspace } from './workspace.service.js';

/**
 * Chapter 02 §02.4 / chapter 06 §06.4 — the ENGINE.
 *
 * The controller owns the HTTP lifecycle. This file owns the loop: perceive →
 * decide → act, with four brakes, an explicit state machine, a causal trace and an
 * economic ledger. All sequencing lives here, driven by the model — which is what
 * makes the controller reviewable in thirty seconds.
 */

/** Chapter 04 §04.7 — a per-tool timeout, so one slow tool cannot eat the deadline. */
const withTimeout = async <T>(work: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    work,
    new Promise<T>((_resolve, reject) => setTimeout(() => reject(new Error(`${label} exceeded ${ms} ms.`)), ms)),
  ]);

export interface ToolCallOutcome {
  trace: ToolCallTrace;
  result: ToolResult;
  /** Chapter 07 §07.4 — set when the call parked behind a human gate. */
  approval: PendingApproval | null;
}

/**
 * Chapter 03 §03.4.1 — the four-stage act pipeline, in ONE function:
 *   schema validation → authorization → business rules (tier) → execution
 *
 * It never throws. Every failure becomes a `ToolResult` with a `code`, because a
 * thrown exception cannot be re-injected as an observation (chapter 03 §03.10).
 */
export const executeToolCall = async (
  call: ToolCall,
  ctx: SessionContext,
  allowedTools: Tool[],
  sessionId: string,
): Promise<ToolCallOutcome> => {
  const startedAt = Date.now();

  const done = (
    outcome: ToolCallTrace['outcome'],
    code: string | undefined,
    result: ToolResult,
    approval: PendingApproval | null = null,
  ): ToolCallOutcome => ({
    trace: {
      id: call.id,
      name: call.name,
      rawArguments: call.arguments,
      tier: getTool(call.name)?.tier ?? 1,
      outcome,
      code,
      content: JSON.stringify(result),
      latencyMs: Date.now() - startedAt,
    },
    result,
    approval,
  });

  const fail = (code: string, message: string): ToolCallOutcome =>
    done('error', code, { status: 'error', code, message });

  // ---- Stage 0: does this tool exist IN THE ROLE-FILTERED REGISTRY? ---------
  // Chapter 08 §08.2.2 — a learner's agent never receives `refundCustomer`, so the
  // model cannot even name it. A filtered tool is simply "unknown".
  const tool = allowedTools.find((candidate) => candidate.name === call.name);
  if (!tool) {
    const available = allowedTools.map((candidate) => candidate.name);
    return fail('UNKNOWN_TOOL', `Unknown tool '${call.name}'. Available: [${available.join(', ')}].`);
  }

  // ---- Stage 1: is the argument string even JSON? (chapter 03 §03.9) -------
  let raw: unknown;
  try {
    raw = JSON.parse(call.arguments || '{}');
  } catch {
    return fail(
      'MALFORMED_ARGUMENTS',
      `Arguments were not valid JSON (${call.arguments.slice(0, 80)}). Re-send the call with valid JSON.`,
    );
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return fail('MALFORMED_ARGUMENTS', 'Arguments must be a JSON object.');
  }

  // ---- Stage 2: schema validation — do the arguments fit the contract? -----
  const parsed = tool.schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    return fail('INVALID_ARGUMENTS', `Arguments do not match the contract → ${issues}`);
  }
  const args = parsed.data as Record<string, unknown>;

  // ---- Stage 3: authorization — may THIS user run THIS tool on THIS object? -
  // Chapter 08 §08.6 — the LLM can request a tool; the backend decides whether it
  // may execute. The model's words are a proposal; this is the decision.
  const decision = authorizeTool(tool, ctx, args);
  if (!decision.allowed) {
    audit({
      type: 'authzDenied',
      actor: ctx.userId,
      tenantId: ctx.tenantId,
      detail: `${tool.name} denied for role '${ctx.role}': ${decision.reason}`,
      severity: 'warning',
    });
    return fail('AUTHZ_DENIED', decision.reason);
  }

  // ---- Stage 4: business rules — is a human required? (chapter 07 §07.4.3) --
  if (HITLPolicyEngine.requiresHumanApproval(tool.name, args)) {
    const approval = createApproval({
      agentSessionId: sessionId,
      toolName: tool.name,
      toolArgs: args,
      requestedBy: ctx.userId,
    });
    audit({
      type: 'approvalRequested',
      actor: ctx.userId,
      tenantId: ctx.tenantId,
      detail: `${tool.name}(${JSON.stringify(args)}) parked as ${approval.id}`,
      severity: 'warning',
    });
    return done(
      'pending',
      'APPROVAL_REQUIRED',
      {
        status: 'error',
        code: 'APPROVAL_REQUIRED',
        message: `This is a Tier 3 action and needs human approval. Ticket ${approval.id} is pending.`,
        approvalId: approval.id,
      },
      approval,
    );
  }

  // ---- Stage 5: execute, once, with a timeout ------------------------------
  try {
    const result = await withTimeout(
      tool.execute(args, toolContextFor(ctx, args)),
      BRAKES.toolTimeoutMs,
      tool.name,
    );
    return done('ok', undefined, { status: 'ok', data: result });
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'TOOL_ERROR';
    const message = err instanceof Error ? err.message : 'Unknown tool error';
    // Chapter 05 §05.8 item 10 — every denial is logged as a security event.
    if (
      code.startsWith('QUOTA_') ||
      code === 'SYMLINK_ESCAPE' ||
      code === 'DENIED_NAME' ||
      code === 'OUTSIDE_WORKSPACE' ||
      code === 'ENCODED_TRAVERSAL'
    ) {
      audit({
        type: 'sandboxDenied',
        actor: ctx.userId,
        tenantId: ctx.tenantId,
        detail: `${tool.name} refused: ${message}`,
        severity: 'critical',
      });
    }
    return fail(code, message);
  }
};

/** Chapter 04 §04.6 — every termination other than #1 returns a partial result and a reason. */
const partialMessage = (halted: HaltReason): string => {
  switch (halted) {
    case 'maxSteps':
      return 'Agent stopped: execution limit reached (partial result attached).';
    case 'timeout':
      return 'Agent stopped: it took too long (partial result attached).';
    case 'tokenCeiling':
      return 'Agent stopped: token budget reached (partial result attached).';
    case 'noProgress':
      return 'Agent stopped: no progress detected — the same action kept repeating.';
    case 'cancelled':
      return 'Agent stopped: cancelled by the user (partial state attached).';
    case 'toolError':
      return 'Agent stopped: an unrecoverable tool failure.';
    default:
      return 'Agent stopped.';
  }
};

export interface RunOptions {
  goal: string;
  ctx: SessionContext;
  maxSteps?: number;
  timeoutMs?: number;
  cancelAfterMs?: number;
  /** Chapter 07 §07.4.1 step 5 — resume a saved session instead of starting fresh. */
  resume?: { sessionId: string; messages: Message[] };
}

export interface RunResult extends AgentRun {
  sessionId: string;
  /** Chapter 08 §08.2.2 — the registry this role was actually offered. */
  toolsOffered: string[];
}

/**
 * Chapter 03 §03.7 — the agent as an explicit state machine, not a `while (true)`.
 *
 *   INITIAL → THINK → TOOL_REQUEST → TOOL_EXECUTION → TOOL_RESULT → THINK
 *   THINK → OUTPUT (terminal)        TOOL_EXECUTION → ERROR (terminal)
 *
 * Every terminal state is named, and the four brakes (chapter 04) are explicit
 * checks rather than hopes.
 */
export const runAgent = async (opts: RunOptions): Promise<RunResult> => {
  // The deadline is computed BEFORE any setup work. A request deadline that starts
  // counting after `initWorkspace` would let setup latency escape the budget
  // (chapter 04 §04.3 — the clock is the whole request, not just the loop).
  const deadline = Date.now() + (opts.timeoutMs ?? BRAKES.requestTimeoutMs);
  const cancelAt = opts.cancelAfterMs === undefined ? Number.POSITIVE_INFINITY : Date.now() + opts.cancelAfterMs;

  await initWorkspace(); // §06.4 — the controller's first job

  const sessionId = opts.resume?.sessionId ?? `sess_${Date.now().toString(36)}`;
  const maxSteps = opts.maxSteps ?? BRAKES.maxSteps;

  // Chapter 08 §08.2.2 — filter the registry BEFORE the model ever sees it.
  const allowedTools = toolsForRole(ALL_TOOLS, opts.ctx.role);
  const wireTools = toWireDefinitions(allowedTools);

  const state: AgentStateRecord = {
    messages: opts.resume?.messages ?? [
      { role: 'system', content: WEBSITE_BUILDER_SYSTEM_PROMPT },
      { role: 'user', content: opts.goal },
    ],
    lastAction: null,
    actionHistory: [],
    toolResults: [],
    startedAt: Date.now(),
  };

  const trace: StepTrace[] = [];
  const ledger: Ledger = {
    modelCalls: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    toolTimeMs: 0,
    steps: 0,
    halted: null,
  };

  let agentState: AgentState = 'INITIAL';
  let answer = '';
  let halted: HaltReason | null = null;
  let pendingApproval: PendingApproval | null = null;

  agentState = 'THINK'; // INITIAL → THINK

  for (let step = 1; step <= maxSteps; step++) {
    ledger.steps = step;

    // ---- Brake 2: wall clock (chapter 04 §04.3) — termination condition 4 ----
    if (Date.now() >= deadline) {
      halted = 'timeout';
      break;
    }
    // ---- Brake 3: token ceiling (chapter 04 §04.4) — termination condition 6 -
    if (ledger.totalInputTokens + ledger.totalOutputTokens > BRAKES.tokenCeiling) {
      halted = 'tokenCeiling';
      break;
    }
    // ---- Termination condition 5: user cancellation --------------------------
    if (Date.now() >= cancelAt) {
      halted = 'cancelled';
      break;
    }

    // ---- PERCEIVE: assemble the context (chapter 03 §03.2) -------------------
    const perceivedAt = Date.now();
    const { message, usage } = await modelStep({ messages: state.messages, tools: wireTools });
    ledger.modelCalls.push({
      step,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs: Date.now() - perceivedAt,
    });
    ledger.totalInputTokens += usage.inputTokens;
    ledger.totalOutputTokens += usage.outputTokens;

    // ---- DECIDE → OUTPUT (termination condition 1: success) ------------------
    if (!message.tool_calls || message.tool_calls.length === 0) {
      agentState = 'OUTPUT';
      answer = message.content ?? '(no answer)';
      state.messages.push(message);
      halted = 'finalAnswer';
      trace.push({ step, state: agentState, assistantContent: message.content, calls: [] });
      break;
    }

    // ---- DECIDE → TOOL_REQUEST ----------------------------------------------
    agentState = 'TOOL_REQUEST';
    state.messages.push(message);

    const calls: ToolCallTrace[] = [];
    let brokeOut = false;

    for (const call of message.tool_calls) {
      // ---- Brake 4: repetition / no-progress (chapter 04 §04.5) -------------
      const actionKey = `${call.name}:${call.arguments}`;
      if (state.actionHistory.filter((seen) => seen === actionKey).length >= BRAKES.repeatedCallLimit) {
        halted = 'noProgress';
        trace.push({ step, state: agentState, assistantContent: message.content, calls, brake: 'noProgress' });
        brokeOut = true;
        break;
      }
      state.actionHistory.push(actionKey);
      state.lastAction = { tool: call.name, args: call.arguments };

      // ---- ACT (chapter 03 §03.4.1) ----------------------------------------
      agentState = 'TOOL_EXECUTION';
      const outcome = await executeToolCall(call, opts.ctx, allowedTools, sessionId);
      calls.push(outcome.trace);
      ledger.toolTimeMs += outcome.trace.latencyMs;

      // Chapter 07 §07.4.1 step 3 — never block the HTTP request on a human.
      // Park the run, persist the session, and answer with a ticket id.
      if (outcome.approval) {
        pendingApproval = outcome.approval;
        saveSession(sessionId, opts.goal, state.messages);
        trace.push({ step, state: 'TOOL_RESULT', assistantContent: message.content, calls });
        brokeOut = true;
        break;
      }

      // ---- OBSERVE: append the result as a `tool` message (chapter 03 §03.4) -
      agentState = 'TOOL_RESULT';
      state.messages.push({ role: 'tool', tool_call_id: call.id, content: outcome.trace.content });
      state.toolResults.push(outcome.result);
    }

    if (brokeOut) break;

    trace.push({ step, state: agentState, assistantContent: message.content, calls });
    agentState = 'THINK'; // TOOL_RESULT → THINK
  }

  if (!halted && !pendingApproval) {
    halted = 'maxSteps'; // the loop exhausted its budget — termination condition 2
    agentState = 'ERROR';
  }

  ledger.halted = halted;

  if (pendingApproval) {
    answer = `Your request needs managerial review. Ticket ${pendingApproval.id} is pending for ${pendingApproval.toolName}(${JSON.stringify(pendingApproval.toolArgs)}). Poll GET /api/approvals, then POST /api/agent/resume.`;
  } else if (halted && halted !== 'finalAnswer') {
    answer = partialMessage(halted);
  }

  return {
    answer,
    state: agentState,
    halted,
    trace,
    ledger,
    pendingApproval,
    sessionId,
    toolsOffered: allowedTools.map((tool) => tool.name),
  };
};

export interface ResumeInput {
  approvalId: string;
  decision: 'approve' | 'reject';
  approverId: string;
  reason?: string;
  ctx: SessionContext;
}

export type ResumeOutcome =
  | { ok: false; error: 'NOT_FOUND' | 'NOT_PENDING' | 'SESSION_LOST'; approval: PendingApproval | null }
  | { ok: true; approval: PendingApproval; resolution: 'executed' | 'replayed' | 'denied'; run: RunResult };

/**
 * Chapter 07 §07.5 — the resumption webhook's whole job, in one function.
 *
 * The five correctness requirements from §07.5.1, in order:
 *   1. reject non-pending tickets      2. record the approver identity
 *   3. execute idempotently            4. inject the decision as an observation
 *   5. return a resumable report
 *
 * Requirement 3 is the one people forget: webhooks are delivered AT-LEAST-ONCE,
 * so a double-click or a Slack retry must not issue a second refund (§07.6).
 */
export const resumeAgent = async (input: ResumeInput): Promise<ResumeOutcome> => {
  const approval = getApproval(input.approvalId);
  if (!approval) return { ok: false, error: 'NOT_FOUND', approval: null };

  // Requirement 1 — only a `pending` ticket may transition.
  if (approval.status !== 'pending') return { ok: false, error: 'NOT_PENDING', approval };

  // Requirement 2 — record WHO decided. Accountability is the entire point of HITL.
  const decided = decideApproval(approval.id, input.decision, input.approverId, input.reason);
  if (!decided) return { ok: false, error: 'NOT_FOUND', approval: null };

  audit({
    type: 'approvalDecided',
    actor: input.approverId,
    tenantId: input.ctx.tenantId,
    detail: `${decided.id} ${decided.status} by ${input.approverId}${input.reason ? ` (${input.reason})` : ''}`,
    severity: 'info',
  });

  // Requirement 5 (first half) — hydrate the durable session state.
  const session = loadSession(decided.agentSessionId);
  if (!session) return { ok: false, error: 'SESSION_LOST', approval: decided };

  const tool = getTool(decided.toolName);

  // Requirement 3 — idempotent execution. Layer 1 is the ticket state machine
  // inside `resolveToolExecution`; layer 2 is the idempotency key that travels to
  // the downstream service, which alone can answer "have I already done this?".
  const resolution = await resolveToolExecution(decided, (args) =>
    tool ? tool.execute(args, toolContextFor(input.ctx, args)) : Promise.resolve({ error: 'UNKNOWN_TOOL' }),
  );

  // Requirement 4 — a rejection is an OBSERVATION, not a termination. The loop
  // resumes so the agent can explain the outcome instead of going silent.
  const lastAssistant = [...session.messages]
    .reverse()
    .find(
      (message): message is AssistantMessage =>
        message.role === 'assistant' && (message.tool_calls?.length ?? 0) > 0,
    );
  const toolCallId = lastAssistant?.tool_calls?.[0]?.id ?? `call_${decided.id}`;

  const content =
    resolution.status === 'denied'
      ? JSON.stringify(resolution.result)
      : JSON.stringify({ status: 'ok', data: resolution.result });

  session.messages.push({ role: 'tool', tool_call_id: toolCallId, content });

  // Requirement 5 (second half) — resume the loop and return the report.
  const run = await runAgent({
    goal: session.goal,
    ctx: input.ctx,
    resume: { sessionId: decided.agentSessionId, messages: session.messages },
  });

  return { ok: true, approval: decided, resolution: resolution.status, run };
};




