# Chapter 06: The Engine — Error Boundary, Agent Loop, Brakes & Trace

> **Chapter goal:** implement chapter 06 §06.2's single error boundary and chapter 05 §05.6's execution loop —
> the two pieces that turn a set of tools into an agent.
> **Notes chapters covered:** 06 §06.1–§06.5 (failure as a result, the two-stage guard, the error contract) ·
> 05 §05.6–§05.8 (the loop, the five brakes, the trace) · 08 §08.5 (the gate) · 08 §08.6 (the ledger).

---

## 6.1 `src/services/agent.service.ts` — part 1: the result contract and the two-stage guard

```ts
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
```

### Block by block

**`serialise()` — the truncation guard.** Chapter 04 §04.8.1 rule 5: *truncate explicitly, never silently.* If a
result exceeds 4 000 characters the model receives `{ status, truncated: true, message, preview }` — it is told
it is looking at a preview, which prevents the "there are only N" conclusion that silent truncation causes. The
truncation happens at the **serialisation boundary**, so no tool has to remember to do it.

**`isRetryable(code)`** — chapter 06 §06.7.1's table, as a function of the *code* rather than of the error class.
Five codes are retryable:

| Code | Why retryable |
| :--- | :--- |
| `MALFORMED_ARGUMENTS` | the model can re-emit valid JSON |
| `INVALID_ARGUMENTS` | the model can fix the arguments |
| `TIMEOUT` | the dependency may have recovered |
| `UPSTREAM_UNAVAILABLE` | transient |
| `RATE_LIMITED` | transient |

Everything else — `NOT_FOUND`, `PERMISSION_DENIED`, `DIVISION_BY_ZERO`, `REFUND_EXCEEDS_INVOICE`,
`APPROVAL_REQUIRED`, `INTERNAL_ERROR` — is `false`. That single boolean is what discourages a model from
thrashing on a failure it cannot fix (chapter 05 §05.7.1's repeated-call brake is the backstop).

**`errorResult()`** — chapter 06 §06.4.1. One function produces every failure in the system, which is what makes
the contract *uniform*: the model can rely on `code`, `message` and `retryable` being present no matter which
layer failed.

**`parseAndValidate()` — the two-stage guard.** This is chapter 06 §06.5, and the reason the two stages stay
separate is worth restating because it is tempting to "simplify" away:

| Stage | Failure | Message produced | What the model does |
| :--- | :--- | :--- | :--- |
| 1 — `JSON.parse` in a `try/catch` | truncated / malformed JSON | *"Arguments were not valid JSON (…). Re-send the call with valid JSON."* | re-emits syntactically valid JSON |
| 2 — `schema.safeParse` | wrong type, missing field, bad enum | *"Arguments failed validation — operation: Invalid enum value. Expected 'add' \| …"* | corrects the specific field |

Collapse them into one and you lose the distinction — and a model that cannot tell *"your JSON was broken"* from
*"your `operation` was wrong"* will repeat the same mistake.

**Why the schema parameter is typed structurally** (`{ safeParse: (value: unknown) => unknown }`) rather than as
a Zod type: it accepts any Zod schema without dragging Zod's generics through this file, and it keeps
`parseAndValidate` callable from anywhere. The real type-safety lives in `Tool.schema` (chapter 02 §02.2).

Verified behaviour, straight from the endpoint:

```text
POST /api/tools/calculate/call  {"arguments":"{\"operation\":\"multiply\",\"a\":10,"}
  -> MALFORMED_ARGUMENTS  Arguments were not valid JSON (Expected double-quoted property name …).  [retryable: true]

POST /api/tools/calculate/call  {"arguments":"{\"operation\":\"times it\",\"a\":10}"}
  -> INVALID_ARGUMENTS  operation: Invalid enum value. Expected 'add' | 'subtract' | … ; b: Required
```

---

## 6.2 `src/services/agent.service.ts` — part 2: the one error boundary

```ts
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
```

### Block by block

**`done(...)` — the single exit.** Every branch returns through this helper, which stamps `latencyMs` and
guarantees the return type. There is no `throw` anywhere in `executeSafely`, which is the mechanical reason
chapter 06 §06.2's diagram has "no path to a 500".

**Step 1 — resolve.** An unknown tool name is *information*: the result lists the available tools. Chapter 07
§07.3.1 calls `UNKNOWN_TOOL` traces "the model telling you what tool you forgot to build" — which is only useful
if the error carries the registry contents.

**Step 2 — validate.** The two-stage guard from §6.1, in one line. Both failure modes already carry a `code`, so
this branch needs no special handling.

**Step 3 — authorise.** `isAllowed(tool, ctx)` is chapter 08 §08.1's check. The important property is *ordering*:
validation happens before authorisation, and authorisation happens before the gate. Structure → identity →
permission → execution. A request that fails validation never reaches an identity check, which keeps the
expensive checks off the hot path.

**Step 4 — the gate.** This is the chapter 08 §08.5 decision, and it has two halves:

```ts
const bound =
  approval?.toolName === tool.name && approval.argsHash === hashArgs(call.arguments) && approval.status === 'approved';

if (!bound) { /* request a new approval and return APPROVAL_REQUIRED */ }
```

Read the boolean carefully — three conditions, all required:

1. **the approval exists and names this tool** (`approval?.toolName === tool.name`)
2. **the argument hash matches** (`approval.argsHash === hashArgs(call.arguments)`) — rule 3
3. **a human approved it** (`approval.status === 'approved'`) — deny by default, rule 2

Because the default path is `!bound → request approval`, a Tier 3 tool *cannot* execute from inside an agent run.
The `approvedApprovalId` parameter is the only way through, and it is only ever passed by the approval endpoint —
never by the loop. Verified:

```text
run "refund INV-1025, 1299"  -> refundPayment -> APPROVAL_REQUIRED (pendingApproval: true, nothing executed)
```

**Step 5 — the cache.** `if (tool.cacheTtlMs)` is the whole policy. A compute tool has no TTL (nothing to cache),
an action tool has none (never cache a mutation), and information tools opt in. The key is
`name:rawArguments`, so it is exactly the tool-call signature. Verified: two identical `getCurrentWeather` calls
return `cached: false` then `cached: true`.

**Step 6 — execute, bounded.** `withTimeout(tool.execute(...), tool.timeoutMs ?? TOOL_POLICY.defaultTimeoutMs, ...)`.
Note the two-layer default: the tool's own timeout wins, with the policy default as a fallback — which is how
`getInvoiceStatus` gets 3 s while `getCurrentWeather` gets 8 s (chapter 04 §04.9).

**Step 7 — classify.** Three branches, in order of specificity:

| Caught | Result | Why this order |
| :--- | :--- | :--- |
| `ToolError` | `{ status: 'error', code: error.code, message: error.message, retryable: isRetryable(code) }` | the tool's own typed domain error — the most informative case |
| `z.ZodError` | `INVALID_ARGUMENTS` with the issue list | a tool that parsed its own args and failed |
| anything else | `INTERNAL_ERROR` with a *generic* message | chapter 06 §06.4.2: strip stack traces, SQL, hostnames, credentials, PII |

The `console.error` in the last branch is the other half of the sanitiser: **the detail is logged server-side,
the model gets a sentence.** The model's context and your observability pipeline have opposite requirements, and
this is the line where they separate.

Verified for all four classes:

```text
calculate(divide, 50, 0)  -> DIVISION_BY_ZERO        retryable: false
refundEverything(...)     -> UNKNOWN_TOOL            available: [calculate, getCurrentWeather, …]
getInvoiceStatus(INV-9001) with tenant-a -> NOT_FOUND  "No invoice INV-9001 for this account."
refundPayment(...)        -> APPROVAL_REQUIRED       pendingApproval: true
```

---

## 6.3 `src/services/agent.service.ts` — part 3: the timeout and the halt message

```ts
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
```

### Block by block

**`withTimeout`** — chapter 04 §04.9.1. Three details worth noting:

1. **It rejects with a `ToolError('TIMEOUT', …, true)`** — not a bare `Error`. The `true` marks it retryable, so
   `isRetryable` returns `true` and the model learns that a retry is legitimate. A bare `Error` would arrive as
   `INTERNAL_ERROR` and tell the model to give up.
2. **`Promise.race` is the mechanism**, so a slow tool does not block the loop indefinitely.
3. **`clearTimeout` is in a `finally`.** Without it, every tool call leaks a timer handle until the process
   restarts — the classic Node.js leak. The `finally` runs on both the resolve and the reject path.

**`DEFAULT_SYSTEM_PROMPT`** — chapter 02 §02.3's division of labour. Five of the six sentences are *policy*, and
they map onto chapters:

| Sentence | Chapter |
| :--- | :--- |
| "Use a tool whenever the answer depends on arithmetic, live data, or a record you cannot know." | 01 §01.3, 04 §04.1 — the routing trigger |
| "Never invent a number, a rate, an id or a weather value." | 01 §01.3 — the arithmetic defect |
| "If a tool returns an error, read the code and message, fix your arguments and try once more; if it still fails, explain the limitation." | 06 §06.6 — the three levels of self-healing |
| "quote the values you received" | 04 §04.8 — grounding the final answer in observations |

The comment above it is the caveat that matters: *"Neither is a security control."* This prompt is advisory.
The registry, the tiers and the approval gate are the controls (chapter 08 §08.1.2).

**`haltAnswer`** — chapter 05 §05.7.3, *"a halt is still an answer"*, in three parts:

1. **the reason**, mapped from the `HaltReason` union — so `maxSteps` produces "I reached my step budget before
   finishing", not "error";
2. **the evidence**, quoting the last two successful observations — so the user gets what *was* learned;
3. **the outstanding work**, naming a pending approval if there is one.

Verified output for a `maxSteps: 1` run of the 2-hop chain:

```text
HALTED: maxSteps | steps: 1
ANSWER: "I reached my step budget before finishing. I did gather: {"status":"ok","data":{…,"convertedAmount":10020,…}}."
```

That is a *useful* failure: the user learns the conversion succeeded and the split did not. Compare
`"Internal Server Error"`, which teaches nothing.

---

## 6.4 `src/services/agent.service.ts` — part 4a: the loop's head

```ts
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
```

### Block by block

**The signature is the architecture.** `runAgent(goal, ctx, opts) → AgentRun`. A string in, a string plus its
causal record out. There is no callback, no event emitter, no tool-specific parameter — which is what makes
chapter 05 §05.6.1's *"the engine is tool-agnostic"* checkable at a glance.

**`messages` is the state.** Chapter 03 §03.5: the model is stateless, so the *entire* conversation lives here
and is re-sent on every hop. Chapter 08 §08.6.1's quadratic cost is a direct consequence of this array growing.

**`deadline` is computed once, before the loop.** A per-iteration `Date.now() + timeout` would never fire, which
is a classic bug. The deadline is an absolute instant.

**`trace` and `ledger` are declared outside the loop.** They accumulate; the loop only appends. That is what makes
chapter 05 §05.8's "causal record" possible — every hop's messages and latencies survive into the response.

**The two semantic brakes need cross-hop memory:**

```ts
const seenCalls = new Map<string, number>();     // name:args -> attempts
const seenObservations = new Set<string>();      // result content -> already seen
```

These are the state that brakes 4 and 5 read. Note they are *per run*, not global: the same call in a different
request is a fresh attempt.

**Brakes 2 and 3 are checked at the top of the iteration.** That ordering matters — the loop refuses to *start* a
step it cannot afford, rather than discovering the problem after the model call has already been billed.

**The ledger is updated immediately after the model call**, using the `usage` the model layer returned (real or
estimated). `ledger.steps = step` is set here too, so a run that halts on brake 2 next iteration still reports the
steps it actually took.

**`messages.push(message)` — invariant 4.** The proposal is stored *exactly* as received, including
`content: null` and the raw `arguments` string. Chapter 03 §03.4's table: modifying it would desynchronise the
model's belief from the history.

**The termination condition.** No `tool_calls` → `finish_reason: "stop"` → return. This is the *only* clean exit
from the loop, and it is why `halted: null` is set explicitly here: the caller must be able to distinguish
"finished" from "stopped".

---

## 6.5 `src/services/agent.service.ts` — part 4b: the step body and the return

```ts
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
```

### Block by block

**The fan-out cap.** `message.tool_calls.slice(0, TOOL_POLICY.maxCallsPerStep)` implements chapter 05 §05.3.1
rule 3: a model can emit twenty calls, and hammering an upstream with twenty parallel requests gets you
rate-limited. The slice is a *runtime* policy, not a prompt request.

**The two accumulators per step:**

```ts
const stepTrace: StepTrace = { step, assistantContent: message.content, calls: [] };
const results: Message[] = [];
```

`stepTrace` becomes one row of the causal record; `results` becomes the `tool` messages appended to the history.
Keeping them separate is deliberate — one is for the engineer, the other is for the model, and they must not be
allowed to drift.

**Brake 4 — the repeated-call hash.** `signature = name:rawArguments`, counted in `seenCalls`. This is the brake
that catches **thrash** (chapter 05 §05.7.2): a model retrying a failing call verbatim. The check happens *before*
execution, so the duplicate is never run.

**The `halted` guard inside the loop — and the invariant it protects.** Once a brake fires mid-batch, every
remaining call still receives a `tool` message:

```ts
if (halted) {
  results.push({ role: 'tool', tool_call_id: call.id, content: errorResult('HALTED', '…') });
  continue;
}
```

This looks defensive but it is required by chapter 03 §03.4 invariant 2: **every `tool_call_id` must receive
exactly one `tool` message.** Without it, a batch that halts halfway would leave the message array structurally
invalid — a latent `400` if that array were ever re-sent.

**`executeSafely(call, ctx)` — no third argument.** Note what is *absent*: the loop never passes an approval id.
That is the security property from §6.2, visible at the call site: **the agent loop has no way to execute a
Tier 3 tool.** Only the approval endpoint can.

**`stepTrace.calls.push({ ..., rawArguments: call.arguments, content: outcome.content })`** — chapter 05 §05.8.
Two raw artefacts, both preserved:

| Field | Why it must be raw |
| :--- | :--- |
| `rawArguments` | when validation fails, this is the string that explains it |
| `content` | the exact observation the model read — the link that satisfies the gate |

**`results.push({ role: 'tool', tool_call_id: call.id, content: outcome.content })`** — chapter 03 §03.3.4's
addressed result. One per call, matched by id.

**Brake 5 — the no-new-information check.** Only *successful* observations are tracked (an error repeated twice is
already caught by brake 4). If a result is byte-identical to one already seen, the run halts as
`noNewInformation`. This is the brake for the *"I'll check again"* loop, where the model rephrases a query but the
world does not change.

**`messages.push(...results)` then `trace.push(stepTrace)`.** The history gets the observations; the trace gets the
row. Both, every step — never one without the other.

**The fall-through:**

```ts
if (!halted) halted = 'maxSteps';
```

The `for` loop can end in three ways: a `break` (brakes 2–5), a `return` (clean termination), or *running out of
iterations*. Only the last reaches this line, and it is brake 1. Naming it explicitly is what lets the ledger
distinguish "the model finished" from "we ran out of budget" — chapter 05 §05.7.3's requirement that a halt be
reported as a halt, not as a failure.

**The return value is four things.** `answer` for the user, `trace` for the engineer, `ledger` for finance, and
`halted` for the dashboard. One endpoint, four audiences — which is exactly what lets `POST /api/agent/run`
satisfy the lecture's gate with no extra machinery.

**Verified end to end.** The 2-hop chain returns `steps: 3`, `halted: null`, a two-row trace whose second row's
`rawArguments` contains `10020`, and a ledger whose `modelCalls` array is `[1148, 1200, 1220]` — the super-linear
shape of chapter 08 §08.6.1, printed by the engine itself.

---

**Next:** [Chapter 07 — Routing & the Fixture Eval](./07_Routing_and_the_Fixture_Eval.md)
