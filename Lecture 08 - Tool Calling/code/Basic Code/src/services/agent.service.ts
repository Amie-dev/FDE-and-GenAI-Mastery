import { z } from 'zod';
import { BRAKES, TOOL_POLICY } from '../config/config.js';
import { getApproval, getTool, hashArgs, isAllowed, needsApproval, requestApproval } from './registry.service.js';
import { ToolError, allTools, cacheGet, cacheSet } from './tools.service.js';
import { modelStep } from '../lib/llm.js';
import type {
  AgentRun,
  HaltReason,
  Ledger,
  Message,
  StepTrace,
  ToolCall,
  ToolChoice,
  ToolContext,
  ToolResult,
} from '../types/agent.types.js';

/**
 * Chapter 05 §05.6 — the execution engine, and chapter 06 §06.2 — the ONE boundary
 * where a tool error is allowed to exist.
 *
 * The loop is deliberately generic: there is no `if (userAskedAboutWeather)` here.
 * All intelligence lives in the model; all authority lives in `executeSafely`.
 */

/** Chapter 04 §04.8 rule 5 — never let a huge result eat the context silently. */
const MAX_RESULT_CHARS = 4_000;

const serialise = (result: ToolResult): string => {
  const json = JSON.stringify(result);
  if (json.length <= MAX_RESULT_CHARS) return json;
  return JSON.stringify({
    status: result.status,
    truncated: true,
    message: `Result exceeded ${MAX_RESULT_CHARS} characters and was truncated.`,
    preview: json.slice(0, MAX_RESULT_CHARS),
  });
};

/**
 * Chapter 06 §06.7.1 — only contract and transient failures are worth another try.
 * Everything else is the model's cue to explain, not to repeat.
 */
const isRetryable = (code: string): boolean =>
  code === 'MALFORMED_ARGUMENTS' ||
  code === 'INVALID_ARGUMENTS' ||
  code === 'TIMEOUT' ||
  code === 'UPSTREAM_UNAVAILABLE' ||
  code === 'RATE_LIMITED';

/** Chapter 06 §06.4.1 — one shape for every failure, from every layer. */
const errorResult = (code: string, message: string, extra: Partial<ToolResult> = {}): string =>
  serialise({ status: 'error', code, message, retryable: isRetryable(code), ...extra });

/**
 * Chapter 06 §06.5 — the two-stage argument defence.
 *
 * Stage 1 (syntax) and stage 2 (structure) are kept apart on purpose: they need
 * different repairs, so they must produce different messages.
 */
export type ParseOutcome =
  | { ok: true; value: unknown }
  | { ok: false; code: 'MALFORMED_ARGUMENTS' | 'INVALID_ARGUMENTS'; message: string };

export const parseAndValidate = (raw: string, schema: { safeParse: (value: unknown) => unknown }): ParseOutcome => {
  let json: unknown;

  // Stage 1 — syntax. `arguments` is a token-by-token string; it can be truncated.
  try {
    json = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      code: 'MALFORMED_ARGUMENTS',
      message: `Arguments were not valid JSON (${(error as Error).message}). Re-send the call with valid JSON.`,
    };
  }

  // Stage 2 — structure and types, against the SAME Zod schema that built the wire contract.
  const parsed = schema.safeParse(json) as
    | { success: true; data: unknown }
    | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } };

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    return { ok: false, code: 'INVALID_ARGUMENTS', message: `Arguments failed validation — ${issues}` };
  }

  return { ok: true, value: parsed.data };
};

/** What one safe execution produced — the content string plus its trace row. */
export interface SafeOutcome {
  content: string;
  outcome: 'ok' | 'error';
  code?: string;
  cached: boolean;
  latencyMs: number;
  pendingApproval: boolean;
}

/**
 * Chapter 06 §06.2 — the only place in the system where a tool error may exist.
 *
 * Every arrow below ends at a `tool` message. There is no path to a 500.
 */
export const executeSafely = async (
  call: ToolCall,
  ctx: ToolContext,
  /** Chapter 08 §08.5.2 rule 3 — an approval id that binds to THIS call's arguments. */
  approvedApprovalId?: string,
): Promise<SafeOutcome> => {
  const started = Date.now();
  const done = (
    content: string,
    outcome: 'ok' | 'error',
    code?: string,
    cached = false,
    pendingApproval = false,
  ): SafeOutcome => ({ content, outcome, code, cached, latencyMs: Date.now() - started, pendingApproval });

  // 1. Resolve — a hallucinated tool name is information, not a crash (chapter 07 §07.3).
  const tool = getTool(call.name);
  if (!tool) {
    return done(
      errorResult('UNKNOWN_TOOL', `No tool named "${call.name}".`, {
        data: { available: allTools.map((item) => item.name) },
      }),
      'error',
      'UNKNOWN_TOOL',
    );
  }

  // 2. Validate — structure before meaning (chapter 02 §02.4).
  const parsed = parseAndValidate(call.arguments, tool.schema);
  if (!parsed.ok) return done(errorResult(parsed.code, parsed.message), 'error', parsed.code);

  // 3. Authorise — the runtime decides, not the prompt (chapter 08 §08.1).
  if (!isAllowed(tool, ctx)) {
    return done(errorResult('PERMISSION_DENIED', 'You are not allowed to perform this action.'), 'error', 'PERMISSION_DENIED');
  }

  // 4. Gate — a Tier 3 action becomes a RESULT, never an execution (chapter 08 §08.5).
  if (needsApproval(tool)) {
    const approval = approvedApprovalId ? getApproval(approvedApprovalId) : undefined;

    // Rule 3 — the approval must bind to the tool AND to these exact arguments.
    const bound =
      approval?.toolName === tool.name && approval.argsHash === hashArgs(call.arguments) && approval.status === 'approved';

    if (!bound) {
      const requested = requestApproval(tool, call.arguments, ctx);
      return done(
        serialise({
          status: 'error',
          code: 'APPROVAL_REQUIRED',
          message: `This action needs human approval before it can run. Tell the user it is pending as ${requested.approvalId}.`,
          retryable: false,
          approvalId: requested.approvalId,
        }),
        'error',
        'APPROVAL_REQUIRED',
        false,
        true,
      );
    }
  }

  // 5. Cache — information tools only; actions are never cached (chapter 04 §04.9).
  const cacheKey = `${tool.name}:${call.arguments}`;
  if (tool.cacheTtlMs) {
    const hit = cacheGet(cacheKey, tool.cacheTtlMs);
    if (hit.hit) return done(serialise({ status: 'ok', data: hit.value }), 'ok', undefined, true);
  }

  // 6. Execute — bounded by the tool's own timeout.
  try {
    const data = await withTimeout(
      tool.execute(parsed.value, ctx),
      tool.timeoutMs ?? TOOL_POLICY.defaultTimeoutMs,
      tool.name,
    );
    if (tool.cacheTtlMs) cacheSet(cacheKey, data);
    return done(serialise({ status: 'ok', data }), 'ok');
  } catch (error) {
    // 7. Classify — and never leak internals into the model's context (chapter 06 §06.4.2).
    if (error instanceof ToolError) {
      return done(errorResult(error.code, error.message, { data: error.details }), 'error', error.code);
    }

    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
      return done(errorResult('INVALID_ARGUMENTS', `Arguments failed validation — ${issues}`), 'error', 'INVALID_ARGUMENTS');
    }

    console.error(`❌ ${tool.name} failed:`, error); // the detail stays server-side
    return done(
      errorResult('INTERNAL_ERROR', `${tool.name} failed unexpectedly. Do not retry; report that it is unavailable.`),
      'error',
      'INTERNAL_ERROR',
    );
  }
};

/** Chapter 04 §04.9.1 — a tool must not outlive the request that called it. */
export const withTimeout = async <T>(work: Promise<T>, timeoutMs: number, toolName: string): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new ToolError('TIMEOUT', `${toolName} did not respond within ${timeoutMs} ms.`, true)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

// ---------------------------------------------------------------------------
// The loop (chapter 05 §05.6)
// ---------------------------------------------------------------------------

/**
 * Chapter 02 §02.3 — the system prompt carries POLICY; the descriptions carry
 * capability. Neither is a security control (chapter 08 §08.1.2).
 */
const DEFAULT_SYSTEM_PROMPT = [
  'You are a tool-using assistant.',
  'Use a tool whenever the answer depends on arithmetic, live data, or a record you cannot know.',
  'Never invent a number, a rate, an id or a weather value — call the tool and use its result.',
  'If a tool returns an error, read the code and message, fix your arguments and try once more;',
  'if it still fails, explain the limitation to the user instead of guessing.',
  'When you are done, answer in one short paragraph and quote the values you received.',
].join(' ');

export interface RunOptions {
  systemPrompt?: string;
  maxSteps?: number;
  timeoutMs?: number;
  /** Chapter 07 §07.2 — the routing policy for this request. */
  toolChoice?: ToolChoice;
}

/**
 * Chapter 05 §05.7.3 — a halt is still an answer. Never return a raw exception and
 * never pretend the task succeeded: state what was found and what is missing.
 */
const haltAnswer = (halted: HaltReason, trace: StepTrace[], pendingApproval: boolean): string => {
  const observations = trace
    .flatMap((step) => step.calls)
    .filter((call) => call.outcome === 'ok')
    .map((call) => call.content);

  const found = observations.length
    ? `I did gather: ${observations.slice(-2).join(' | ')}.`
    : 'I could not gather any data.';

  const reason: Record<HaltReason, string> = {
    maxSteps: 'I reached my step budget before finishing',
    timeout: 'I ran out of time before finishing',
    tokenCeiling: 'I reached the cost ceiling for this request',
    noProgress: 'the same call kept failing, so I stopped instead of looping',
    noNewInformation: 'a repeated call returned nothing new',
    toolUnavailable: 'a tool I needed was unavailable',
  };

  const approval = pendingApproval ? ' One action is still waiting for human approval.' : '';
  return `${reason[halted]}. ${found}${approval}`;
};

/**
 * Chapter 05 §05.6 — the engine. Four responsibilities and nothing else:
 * assemble context, decide continuation, execute safely, observe.
 */
export async function runAgent(goal: string, ctx: ToolContext, opts: RunOptions = {}): Promise<AgentRun> {
  const maxSteps = opts.maxSteps ?? BRAKES.maxSteps;
  const deadline = Date.now() + (opts.timeoutMs ?? BRAKES.requestTimeoutMs);

  // Chapter 03 §03.5 — the message array is the state. It grows every hop.
  const messages: Message[] = [
    { role: 'system', content: opts.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
    { role: 'user', content: goal },
  ];

  const trace: StepTrace[] = [];
  const ledger: Ledger = {
    modelCalls: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    toolTimeMs: 0,
    steps: 0,
    halted: null,
  };

  // Chapter 05 §05.7.1 — the two semantic brakes need memory across hops.
  const seenCalls = new Map<string, number>();
  const seenObservations = new Set<string>();

  let pendingApproval = false;
  let halted: HaltReason | null = null;

  for (let step = 1; step <= maxSteps; step++) {
    // Brake 2 — wall clock. A stalled provider or tool must not hold the request open.
    if (Date.now() > deadline) {
      halted = 'timeout';
      break;
    }
    // Brake 3 — the cost ceiling. History is re-sent every turn (chapter 08 §08.6.1).
    if (ledger.totalInputTokens > BRAKES.tokenCeiling) {
      halted = 'tokenCeiling';
      break;
    }

    const callStarted = Date.now();
    const { message, usage } = await modelStep({ messages, toolChoice: opts.toolChoice });
    ledger.modelCalls.push({
      step,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs: Date.now() - callStarted,
    });
    ledger.totalInputTokens += usage.inputTokens;
    ledger.totalOutputTokens += usage.outputTokens;
    ledger.steps = step;

    // Chapter 03 §03.4 invariant 4 — store the proposal EXACTLY as received.
    messages.push(message);

    // Termination: `finish_reason: "stop"` with no tool_calls (chapter 03 §03.3.5).
    if (!message.tool_calls?.length) {
      ledger.halted = null;
      return { answer: message.content ?? '', steps: step, halted: null, trace, ledger, pendingApproval };
    }


    // Chapter 05 §05.3.1 rule 3 — bound the fan-out of a parallel batch.
    const calls = message.tool_calls.slice(0, TOOL_POLICY.maxCallsPerStep);
    const stepTrace: StepTrace = { step, assistantContent: message.content, calls: [] };
    const results: Message[] = [];

    for (const call of calls) {
      // Chapter 05 §05.7.1 — brake 4: the same name+args hash, again.
      const signature = `${call.name}:${call.arguments}`;
      const attempts = (seenCalls.get(signature) ?? 0) + 1;
      seenCalls.set(signature, attempts);

      if (!halted && attempts > BRAKES.repeatedCallLimit) halted = 'noProgress';

      if (halted) {
        // Chapter 03 §03.4 invariant 2 — every tool_call_id still gets a result, so
        // the message array stays valid even though the run is stopping here.
        results.push({
          role: 'tool',
          tool_call_id: call.id,
          content: errorResult('HALTED', 'The run was halted before this call executed.'),
        });
        continue;
      }

      const outcome = await executeSafely(call, ctx);
      ledger.toolTimeMs += outcome.latencyMs;
      if (outcome.pendingApproval) pendingApproval = true;

      stepTrace.calls.push({
        id: call.id,
        name: call.name,
        rawArguments: call.arguments, // chapter 05 §05.8 — keep the RAW string
        outcome: outcome.outcome,
        code: outcome.code,
        content: outcome.content,
        latencyMs: outcome.latencyMs,
        cached: outcome.cached,
      });

      // Chapter 03 §03.3.4 — one addressed result per call.
      results.push({ role: 'tool', tool_call_id: call.id, content: outcome.content });

      // Chapter 05 §05.7.1 — brake 5: an identical observation means no new information.
      if (outcome.outcome === 'ok') {
        if (seenObservations.has(outcome.content)) halted = 'noNewInformation';
        else seenObservations.add(outcome.content);
      }
    }

    messages.push(...results);
    trace.push(stepTrace);
    if (halted) break;
  }

  // Brake 1 — the step budget, and the fall-through for every other brake.
  if (!halted) halted = 'maxSteps';
  ledger.halted = halted;

  return {
    answer: haltAnswer(halted, trace, pendingApproval),
    steps: ledger.steps,
    halted,
    trace,
    ledger,
    pendingApproval,
  };
}

