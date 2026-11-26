# Chapter 02: Config & Types

> **Chapter goal:** validate the environment once at boot, freeze the policy the engine reads, and define every
> shared shape the protocol needs — messages, the tool contract, the uniform result, the trace and the ledger.
> **Notes chapters covered:** 02 §02.1–§02.2 (the contract) · 03 §03.3–§03.4 (messages and roles) ·
> 04 §04.3 (result contract) · 05 §05.7–§05.8 (brakes and trace) · 08 §08.6.3 (ledger).

---

## 2.1 `src/config/config.ts` (full file)

```ts
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** Chapter 03 §03.7 — one endpoint per provider. All three speak the OpenAI dialect. */
export const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
} as const;

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8098),

  // Chapter 07 §07.2 — the routing policy. `auto` is the only policy that lets
  // the model answer "I don't need a tool", which is often the right answer.
  AI_PROVIDER: z.enum(['openai', 'groq', 'ollama']).default('openai'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(500), // B_output
  TOOL_CHOICE: z.string().default('auto'),

  // Chapter 05 §05.7 — the five brakes. Every one of them is a separate failure.
  MAX_STEPS: z.coerce.number().int().min(1).max(20).default(6),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(60_000),
  TOKEN_CEILING: z.coerce.number().int().positive().default(60_000),
  REPEATED_CALL_LIMIT: z.coerce.number().int().min(1).default(2),

  // Chapter 04 §04.9 — operational policy per tool family.
  TOOL_TIMEOUT_MS: z.coerce.number().int().min(100).default(8_000),
  CACHE_TTL_MS: z.coerce.number().int().min(0).default(300_000),
  MAX_CALLS_PER_STEP: z.coerce.number().int().min(1).max(16).default(4),

  // Chapter 06 §06.5 — the request shape is the first thing to validate.
  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(2_000),

  OPENAI_API_KEY: z.string().default(''),
  GROQ_API_KEY: z.string().default(''),
  OLLAMA_BASE_URL: z.string().default(PROVIDER_ENDPOINTS.ollama),
});

const parsed = envSchema.safeParse(process.env);

// Fail fast, fail loud: a bad .env dies at boot, not on request one.
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

/** Which key belongs to which provider. Ollama runs locally, so it has none. */
const KEY_FOR: Record<string, 'OPENAI_API_KEY' | 'GROQ_API_KEY' | ''> = {
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
  ollama: '',
};

const activeApiKey = (): string => {
  const name = KEY_FOR[env.AI_PROVIDER];
  return name ? env[name] : '';
};

/** Frozen boot-time configuration — nothing drifts at runtime. */
export const config = Object.freeze({
  ...env,
  AI_ENDPOINT: env.AI_PROVIDER === 'ollama' ? env.OLLAMA_BASE_URL : PROVIDER_ENDPOINTS[env.AI_PROVIDER],
  AI_API_KEY: activeApiKey(),
});

/**
 * Chapter 05 §05.7.1 — the loop brakes, in one object so the engine stays thin.
 * Nesting rule: tool timeout ⊂ retry budget ⊂ request deadline.
 */
export const BRAKES = Object.freeze({
  maxSteps: config.MAX_STEPS,
  requestTimeoutMs: config.REQUEST_TIMEOUT_MS,
  tokenCeiling: config.TOKEN_CEILING,
  repeatedCallLimit: config.REPEATED_CALL_LIMIT,
});

/** Chapter 04 §04.9 — per-tool operational policy. */
export const TOOL_POLICY = Object.freeze({
  defaultTimeoutMs: config.TOOL_TIMEOUT_MS,
  cacheTtlMs: config.CACHE_TTL_MS,
  maxCallsPerStep: config.MAX_CALLS_PER_STEP,
});

/** Chapter 08 §08.2 — the tier that cannot auto-execute. */
export const APPROVAL_REQUIRED_TIER = 'critical' as const;

export type Config = typeof config;
```

### Block by block

**`dotenv.config()` before the schema.** Order matters: the parse must see the file, not just `process.env`.
If you move this line below `envSchema.safeParse`, every value silently falls back to its default.

**`z.coerce.number()`** — environment variables are strings. `z.coerce.number()` converts and *then*
validates, so `MAX_STEPS=abc` fails at boot with a readable message instead of becoming `NaN` inside the loop
where it would disable the brake entirely. That is the difference between a configuration error and a
production incident.

**`safeParse` + `process.exit(1)`** — this is chapter 06 §06.5 applied to the process itself: validate before
doing any work, and fail loudly at the earliest possible moment.

**`KEY_FOR` / `activeApiKey()`** — chapter 03 §03.7's provider difference, in three lines. Ollama is local and
needs no key, so the mapping returns `''` rather than forcing a fake credential into the client.

**`config = Object.freeze({...})`** — frozen at boot. Nothing in the request path can mutate the model name or
the endpoint, so a bug cannot make one request behave differently from another.

**`BRAKES`** — chapter 05 §05.7.1's five stops, grouped so the engine reads like prose:

```ts
if (Date.now() > deadline) { halted = 'timeout'; break; }
if (ledger.totalInputTokens > BRAKES.tokenCeiling) { halted = 'tokenCeiling'; break; }
if (attempts > BRAKES.repeatedCallLimit) halted = 'noProgress';
```

**`TOOL_POLICY`** — chapter 04 §04.9's per-family policy: a default timeout, the TTL information tools use,
and the fan-out cap for a parallel batch.

**`APPROVAL_REQUIRED_TIER`** — chapter 08 §08.2's Tier 3, named once so `needsApproval()` cannot drift from
the documentation.

---

## 2.2 `src/types/agent.types.ts` (full file — part 1 of 2)

```ts
/**
 * Lecture 08 — shared types.
 *
 * Every type here makes one notes chapter concrete: a message as it travels on the
 * wire, a tool contract, the uniform result shape, one row of the trace, and the
 * per-request token ledger.
 */

/**
 * Chapter 03 §03.4 — the four roles. `tool` is a first-class role, not a return value.
 */
export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface SystemMessage {
  role: 'system';
  content: string;
}

export interface UserMessage {
  role: 'user';
  content: string;
}

/**
 * Chapter 03 §03.2 — the proposal. `content` is usually null because the model
 * wrote a proposal, not prose; `finish_reason: "tool_calls"` is the real signal.
 */
export interface AssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
}

/**
 * Chapter 03 §03.3.2 — one requested call. Note `arguments` is a STRING, not an
 * object: it is generated token by token and can be truncated (chapter 06 §06.5).
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

/**
 * Chapter 03 §03.3.4 — the result turn. It must quote the proposal's id, or the
 * provider rejects the request ("tool_call_id not found").
 */
export interface ToolMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

export type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

/** Chapter 04 §04.1 — the three families, and everything that follows from them. */
export type ToolFamily = 'compute' | 'information' | 'action';

/**
 * Chapter 08 §08.2 — the authorization matrix. read → auto, write → scoped,
 * critical → human approval required.
 */
export type PermissionTier = 'read' | 'write' | 'critical';

/** Chapter 04 §04.6 / §04.8 — identity comes from the session, never from arguments. */
export interface ToolContext {
  userId: string;
  tenantId: string;
}

/** The tiny slice of Zod we actually use, so `Tool` stays readable. */
export interface ZodLike {
  safeParse(value: unknown):
    | { success: true; data: unknown }
    | {
        success: false;
        error: { issues: { path: (string | number)[]; message: string }[] };
      };
}

/**
 * Chapter 02 §02.1 — a tool is an implementation PLUS a contract. Only `name`,
 * `description` and `parameters` ever leave this process.
 */
export interface Tool {
  name: string;
  description: string;
  /** The JSON Schema the model reads — built from the same Zod schema we validate with. */
  parameters: Record<string, unknown>;
  /** The runtime half of the contract (chapter 02 §02.5). */
  schema: ZodLike;
  family: ToolFamily;
  tier: PermissionTier;
  timeoutMs?: number;
  cacheTtlMs?: number;
  /**
   * `args` is `unknown` on purpose: the registry is heterogeneous, so the boundary
   * is the one place a wide type is honest. Each tool re-parses with its own Zod
   * schema, which makes it safe to call directly as well as through the loop.
   */
  execute: (args: unknown, ctx: ToolContext) => Promise<unknown>;
}

/** Chapter 02 §02.2 — exactly what is serialized into the request's `tools` array. */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
```

### Block by block

**`Role` and the four message interfaces** — chapter 03 §03.4's role table, typed. The important detail is
that `ToolMessage` is a **message**, not a return value: it carries `tool_call_id` because the protocol
correlates results by id, not by position. Modelling it as a message is what makes the invariant enforceable
in the type system.

**`AssistantMessage.content: string | null`** — chapter 03 §03.3.2. If you type this as `string`, you will
eventually write `content.length` on a `null` proposal and crash on the most common tool-calling response.

**`ToolCall.arguments: string`** — the single most important type decision in the file. It is a *string*
because the model emits it token by token and it can arrive truncated. Every validation bug in chapter 06
disappears the moment you stop pretending it is an object.

**`Message` as a discriminated union** — `message.role` narrows the type, so the engine cannot read
`tool_call_id` off a user message. The compiler enforces chapter 03's invariant table.

**`Tool`** — chapter 02 §02.1's "implementation + contract" in one interface. Notice what is *absent*:
there is no `id`, no `url`, no `auth`. The model sees `name`, `description`, `parameters`; the runtime keeps
`schema`, `tier`, `timeoutMs`, `cacheTtlMs` and `execute` to itself. That asymmetry *is* the security model.

**`parameters: Record<string, unknown>`** — deliberately untyped. It is a JSON Schema document that is
serialised and sent away; typing it as a schema object would buy nothing and would make `zod-to-json-schema`
harder to plug in.

**`execute: (args: unknown, ctx: ToolContext) => Promise<unknown>`** — `unknown` because the registry holds
heterogeneous tools. Each tool re-parses its own args, which is also what makes
`POST /api/tools/:name/call` safe to call directly, bypassing the loop.

**`ToolDefinition`** — chapter 02 §02.2's wire shape, byte for byte: `{ type: 'function', function: {...} }`.

---

## 2.3 `src/types/agent.types.ts` (full file — part 2 of 2)

```ts
/** Chapter 07 §07.2 — the four routing policies. */
export type ToolChoice = 'auto' | 'required' | 'none' | { name: string };

/**
 * Chapter 04 §04.3 / chapter 06 §06.4 — ONE result contract for success and failure.
 * The model can branch on `code`; it cannot branch on prose.
 */
export interface ToolResult {
  status: 'ok' | 'error';
  /** Success payload, or the offending values on failure. */
  data?: unknown;
  code?: string;
  message?: string;
  /** Only contract and transient errors are worth retrying (chapter 06 §06.7.1). */
  retryable?: boolean;
  /** Chapter 04 §04.8 — never truncate silently. */
  truncated?: boolean;
  totalMatches?: number;
  returned?: number;
  /** Chapter 08 §08.5 — a Tier 3 action returns pending, not an exception. */
  approvalId?: string;
}

/** Chapter 05 §05.8 — one executed call, with the RAW arguments preserved. */
export interface ToolCallTrace {
  id: string;
  name: string;
  /** The exact string the model emitted — the artefact that explains a failure. */
  rawArguments: string;
  outcome: 'ok' | 'error';
  code?: string;
  /** The exact string sent back in the `tool` message. */
  content: string;
  latencyMs: number;
  /** Chapter 04 §04.9 — true when a TTL cache served this call. */
  cached: boolean;
}

/** Chapter 05 §05.8 — one hop of the loop. */
export interface StepTrace {
  step: number;
  /** What the model said before proposing (often null — chapter 03 §03.3.2). */
  assistantContent: string | null;
  calls: ToolCallTrace[];
}

/** Chapter 05 §05.7.2 — the five brakes, plus the two semantic ones. */
export type HaltReason =
  | 'maxSteps'
  | 'timeout'
  | 'tokenCeiling'
  | 'noProgress'
  | 'noNewInformation'
  | 'toolUnavailable';

/** Chapter 08 §08.6.3 — the economic ledger. */
export interface Ledger {
  modelCalls: { step: number; inputTokens: number; outputTokens: number; latencyMs: number }[];
  totalInputTokens: number;
  totalOutputTokens: number;
  toolTimeMs: number;
  steps: number;
  /** Chapter 05 §05.7.1 — which brake fired, if any. */
  halted: HaltReason | null;
}

/** Chapter 05 §05.6 — what one run returns: the answer AND the causal record. */
export interface AgentRun {
  answer: string;
  steps: number;
  halted: HaltReason | null;
  trace: StepTrace[];
  ledger: Ledger;
  /** Chapter 08 §08.5 — true when a Tier 3 call is waiting for a human. */
  pendingApproval: boolean;
}

/** Chapter 07 §07.5 — a fixture is a request plus the expected behaviour. */
export type RoutingExpectation =
  | { kind: 'noTool' }
  | { kind: 'firstTool'; name: string }
  | { kind: 'toolChain'; names: string[] }
  | { kind: 'anyOf'; names: string[] };

export interface RoutingFixture {
  id: string;
  request: string;
  expect: RoutingExpectation;
  /** Chapter 02 §02.4 — structure is asserted here; meaning is a runtime concern. */
  argAssertions?: { path: string; equals?: unknown; matches?: string; isNumber?: boolean }[];
  maxHops?: number;
}

/** Chapter 07 §07.4.1 — the four metrics. */
export interface RoutingEvalReport {
  selectionAccuracy: number;
  argumentValidity: number;
  avgHops: number;
  terminationRate: number;
  rows: {
    id: string;
    request: string;
    expected: string;
    observed: string;
    selectionOk: boolean;
    argsOk: boolean;
    hops: number;
    halted: HaltReason | null;
  }[];
  /** Chapter 07 §07.5.3 — expected tool × observed tool. */
  confusionMatrix: Record<string, Record<string, number>>;
}
```

### Block by block

**`ToolChoice`** — chapter 07 §07.2's four policies as a union: the three strings, plus `{ name }` for a forced
tool. Modelling the forced case as an object (not a fourth string) is what makes `'auto'` impossible to
confuse with a tool literally named `auto`.

**`ToolResult`** — chapters 04 and 06 in one interface. Every field exists for a reason the notes give:

| Field | Chapter | Why it is there |
| :--- | :--- | :--- |
| `status` | 06 §06.4.1 | present on **success too**, so the model never infers failure from absence |
| `code` | 06 §06.4.1 | a stable SCREAMING_SNAKE id the model can branch on |
| `message` | 06 §06.4.1 | one sentence written for the model, quotable in the final answer |
| `retryable` | 06 §06.7.1 | only contract and transient failures are worth another attempt |
| `truncated` / `totalMatches` / `returned` | 04 §04.8.1 rule 5 | explicit truncation, so the model never concludes "only 10 exist" |
| `approvalId` | 08 §08.5 | a Tier 3 action returns *pending*, never an exception |

**`ToolCallTrace`** — chapter 05 §05.8's requirement made concrete. `rawArguments` is the field that satisfies
the lecture's gate and avoids the trace anti-pattern in §05.8.3: if you log only the parsed arguments, you
cannot explain a validation failure afterwards. `content` is the *exact* string that went back to the model.

**`StepTrace`** — one hop. `assistantContent` is `string | null` for the same reason as the message type: the
proposal turn usually carries no prose.

**`HaltReason`** — chapter 05 §05.7.2's failure modes, as a union. Naming them means the ledger's `halted`
field cannot hold a free-form string, so your dashboards stay aggregatable and your alerts stay precise.

**`Ledger`** — chapter 08 §08.6.3. `modelCalls[]` per step is what makes the super-linear cost *visible*:
run the 3-model-call chain and read the array `[1148, 1200, 1220]` — each call is larger than the last because it
carries the whole history plus the tool definitions.

**`AgentRun`** — the return value of the engine, deliberately more than an answer. The answer is for the user;
`trace`, `ledger` and `halted` are for the engineer. Returning all four from one call is what lets a single
endpoint satisfy the gate.

**`RoutingFixture` / `RoutingExpectation`** — chapter 07 §07.5. Four expectation kinds is the whole trick:
`noTool` (the negative case teams forget), `firstTool`, `toolChain` (order matters) and `anyOf` (a batch, where
any first call is acceptable). `argAssertions` asserts on **structure** (equals / matches / isNumber), never
on meaning — chapter 02 §02.4.

**`RoutingEvalReport`** — chapter 07 §07.4.1's four metrics plus the raw rows and the confusion matrix. The
matrix is `Record<expected, Record<observed, count>>`, which is why the `none` row appears naturally instead
of needing special handling.

---

**Next:** [Chapter 03 — Tool Contracts & the Registry](./03_Tool_Contracts_and_the_Registry.md)
