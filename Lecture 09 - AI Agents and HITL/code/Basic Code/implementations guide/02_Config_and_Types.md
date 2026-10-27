# Chapter 02: Config & Types

> **Chapter goal:** make the notes' vocabulary real in TypeScript — the agency spectrum, the four brakes, the
> quotas, the three authorization tiers, the risk bands, the named agent states, the tool contract, the trace,
> the ledger and the durable approval record.
> **Notes chapters covered:** 01 §01.2 · 02 §02.1, §02.2 · 03 §03.4, §03.7, §03.9 · 04 §04.6, §04.8 ·
> 05 §05.3, §05.7 · 07 §07.2, §07.4.2 · 08 §08.2, §08.6, §08.7.3, §08.9.

---

## 2.1 `src/config/config.ts` (full file)

```ts
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** Chapter 03 §03.3.7 — one endpoint per provider. All three speak the OpenAI dialect. */
export const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
} as const;

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8099),

  // Chapter 01 §01.2 — the agency spectrum. Which level this process runs at is a
  // configuration decision, not a code change.
  AGENCY_LEVEL: z.coerce.number().int().min(1).max(4).default(4),

  AI_PROVIDER: z.enum(['openai', 'groq', 'ollama']).default('openai'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),

  // Chapter 04 §04.2–§04.5 — the four brakes.
  MAX_STEPS: z.coerce.number().int().min(1).max(30).default(8),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(60_000),
  TOKEN_CEILING: z.coerce.number().int().positive().default(60_000),
  REPEATED_CALL_LIMIT: z.coerce.number().int().min(1).default(2),
  TOOL_TIMEOUT_MS: z.coerce.number().int().min(100).default(8_000),

  // Chapter 05 §05.4–§05.7 — the jail and its quotas.
  WORKSPACE_ROOT: z.string().min(1).default('./workspace'),
  MAX_FILE_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  MAX_WORKSPACE_BYTES: z.coerce.number().int().positive().default(100 * 1024 * 1024),
  MAX_FILES: z.coerce.number().int().positive().default(500),
  MAX_DEPTH: z.coerce.number().int().positive().default(10),
  MAX_PATH_LENGTH: z.coerce.number().int().positive().default(255),

  // Chapter 07 §07.4.3 — the Tier 3 policy.
  FINANCIAL_THRESHOLD: z.coerce.number().positive().default(5_000),
  APPROVAL_TTL_MS: z.coerce.number().int().positive().default(900_000),

  // Chapter 08 §08.7.3 — the risk bands.
  RISK_ALLOW_MAX: z.coerce.number().int().min(0).max(100).default(29),
  RISK_RESTRICT_MIN: z.coerce.number().int().min(0).max(100).default(60),
  RISK_BLOCK_MIN: z.coerce.number().int().min(0).max(100).default(80),

  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(4_000),

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

/**
 * Chapter 05 §05.4 — the jail root, ABSOLUTE and canonical from the very first
 * line. `safePath` compares resolved strings against it, so it must not be a
 * relative path that changes meaning with the process's cwd.
 */
export const WORKSPACE_ROOT = path.resolve(process.cwd(), env.WORKSPACE_ROOT);

/** Frozen boot-time configuration — nothing drifts at runtime. */
export const config = Object.freeze({
  ...env,
  WORKSPACE_ROOT,
  AI_ENDPOINT: env.AI_PROVIDER === 'ollama' ? env.OLLAMA_BASE_URL : PROVIDER_ENDPOINTS[env.AI_PROVIDER],
  AI_API_KEY: activeApiKey(),
});

/** Chapter 01 §01.2 — the agency spectrum, as the process describes itself. */
export const AGENCY_SPECTRUM = {
  1: { name: 'Raw foundation LLM', loop: false, tools: 0, note: 'Text in → text out. No sensors, no actuators.' },
  2: { name: 'LLM + single tool', loop: false, tools: 1, note: 'One capability gap closed in one round trip.' },
  3: { name: 'LLM + multi-tool selection', loop: false, tools: 7, note: 'Dynamic routing. One decision per request.' },
  4: { name: 'Autonomous goal-directed agent', loop: true, tools: 7, note: 'Decide → act → observe, until the goal verifies.' },
} as const;

/** Chapter 04 §04.2–§04.5 — the four brakes, in one object so the engine stays thin. */
export const BRAKES = Object.freeze({
  maxSteps: config.MAX_STEPS,
  requestTimeoutMs: config.REQUEST_TIMEOUT_MS,
  tokenCeiling: config.TOKEN_CEILING,
  repeatedCallLimit: config.REPEATED_CALL_LIMIT,
  /** §04.7 — the nesting rule: tool timeout ⊂ request deadline ⊂ token ceiling. */
  toolTimeoutMs: config.TOOL_TIMEOUT_MS,
});

/** Chapter 05 §05.7 — quotas are a security control, not hygiene. */
export const QUOTAS = Object.freeze({
  maxFileBytes: config.MAX_FILE_BYTES,
  maxWorkspaceBytes: config.MAX_WORKSPACE_BYTES,
  maxFiles: config.MAX_FILES,
  maxDepth: config.MAX_DEPTH,
  maxPathLength: config.MAX_PATH_LENGTH,
});

/** Chapter 07 §07.4.3 — the Tier 3 gate's numbers. */
export const TIER_POLICY = Object.freeze({
  financialThreshold: config.FINANCIAL_THRESHOLD,
  approvalTtlMs: config.APPROVAL_TTL_MS,
});

/** Chapter 08 §08.7.3 — the four risk bands. */
export const RISK_BANDS = Object.freeze({
  allowMax: config.RISK_ALLOW_MAX,
  restrictMin: config.RISK_RESTRICT_MIN,
  blockMin: config.RISK_BLOCK_MIN,
});

/**
 * Chapter 05 §05.3 vector 3 — the sensitive-name deny-list.
 * Even inside the jail, these names are refused: writing them is config
 * injection, dependency hijacking or secret leakage.
 */
export const DENIED_NAMES = Object.freeze([
  '.env',
  '.env.local',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'server.ts',
  'config.ts',
  'id_rsa',
  '.git',
]);

export type Config = typeof config;
```

### Block by block

**`WORKSPACE_ROOT = path.resolve(process.cwd(), env.WORKSPACE_ROOT)`**

Chapter 05 §05.4 compares *resolved strings* against a root. If the root is a relative path like `./workspace`, it
changes meaning the moment the process's working directory changes — and every containment check silently compares
against the wrong prefix. Resolving it **once, at boot, absolutely** is what makes `safePath` correct.

**`envSchema` + `safeParse` + `process.exit(1)`**

```ts
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) { /* print every issue */ process.exit(1); }
```

Fail fast, fail loud. A malformed `.env` should kill the process at boot, not produce a confusing 500 on request
one. `z.coerce.number()` matters here because environment variables are always strings.

**`AGENCY_SPECTRUM`**

Chapter 01 §01.2 says agency is a *spectrum*, not a switch. Encoding the four levels as data (not as four code
paths) is what lets `/api/health` answer *"which level am I?"* — and lets you change level without touching the
loop.

**`BRAKES`** (chapter 04 §04.2–§04.5)

```ts
export const BRAKES = Object.freeze({
  maxSteps: 8,             // brake 1 — loop bounding
  requestTimeoutMs: 60000, // brake 2 — wall clock
  tokenCeiling: 60000,     // brake 3 — cost
  repeatedCallLimit: 2,    // brake 4 — repetition / no progress
  toolTimeoutMs: 8000,     // §04.7 — the nesting rule
});
```

Grouping them in one frozen object is a design choice with a payoff: `agent.service.ts` can read every brake from
one import, so the engine stays thin and there is exactly one place where a brake can be changed.

**`QUOTAS`** (chapter 05 §05.7)

> *Why quotas are a security control and not just hygiene:* they convert a DoS into a **detectable error**. A 50 GB
> write that fails with `QUOTA_FILE_SIZE` is an incident you can log. A 50 GB write that succeeds is an outage.

**`DENIED_NAMES`** (chapter 05 §05.3 vector 3)

Even inside the jail, `.env`, `package.json` and `server.ts` are refused. This is defence in depth for the case
where the jail is *misconfigured*: a bad `WORKSPACE_ROOT` should not hand the agent your dependency manifest.

**`Object.freeze`** on every exported config object — nothing drifts at runtime, so a bug cannot be "config changed
under me".

---

## 2.2 `src/types/agent.types.ts` (full file)

```ts
/**
 * Lecture 09 — shared types.
 *
 * Every type here makes one notes chapter concrete: a message on the wire, the
 * agent's named states, a tool contract with its tier and permission, the uniform
 * result shape, one row of the trace, the per-request ledger, the durable
 * approval record and one line of the security audit log.
 */

/**
 * Chapter 03 §03.4 — the four message roles. `tool` is a first-class role, not a
 * return value: that is what lets the model *observe* what happened.
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
 * Chapter 03 §03.3 — the proposal. `content` is usually null because the model
 * wrote a proposal, not prose.
 */
export interface AssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
}

/**
 * Chapter 03 §03.9 — one requested call. `arguments` is a STRING, not an object:
 * it is generated token by token, so it can be malformed. Never trust it.
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

/** Chapter 03 §03.4 — the result turn, addressed by the proposal's id. */
export interface ToolMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

export type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

/**
 * Chapter 03 §03.7 — the explicit state machine. Every terminal state is named,
 * which is the difference between a loop you can test and a `while (true)`.
 *
 *   INITIAL → THINK → TOOL_REQUEST → TOOL_EXECUTION → TOOL_RESULT → THINK
 *   THINK → OUTPUT (terminal)      TOOL_EXECUTION → ERROR (terminal)
 */
export type AgentState =
  | 'INITIAL'
  | 'THINK'
  | 'TOOL_REQUEST'
  | 'TOOL_EXECUTION'
  | 'TOOL_RESULT'
  | 'OUTPUT'
  | 'ERROR';

/**
 * Chapter 04 §04.6 — the six termination conditions. Every one is an explicit
 * check, and every non-success one carries a machine-readable reason.
 */
export type HaltReason =
  | 'finalAnswer' // 1. Success
  | 'maxSteps' // 2. Step budget
  | 'toolError' // 3. Unrecoverable tool failure
  | 'timeout' // 4. Timeout
  | 'cancelled' // 5. User cancellation
  | 'tokenCeiling' // 6. Cost budget
  | 'noProgress'; // chapter 04 §04.5 — the fourth brake

/**
 * Chapter 07 §07.2 — the 3-tier authorization matrix.
 * 1 = read-only (auto) · 2 = scoped mutate in the jail (auto within quotas)
 * 3 = high-impact / irreversible (HITL mandatory)
 */
export type ToolTier = 1 | 2 | 3;

/** Chapter 08 §08.2 — the three canonical roles from the notes. */
export type UserRole = 'learner' | 'instructor' | 'admin';

/**
 * Chapter 08 §08.2 — RBAC in one line: a role carries permissions, and a
 * permission is `<resource>:<action>`.
 */
export type Permission =
  | 'workspace:read'
  | 'workspace:write'
  | 'workspace:read:all' // instructor/admin only — needed for a cross-user read
  | 'calc:run'
  | 'billing:refund'
  | 'deploy:run';

/**
 * Chapter 08 §08.2.2 / §08.3 — identity comes from the SESSION. It is never a
 * tool argument and never something the model gets to state.
 */
export interface SessionContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

/** Chapter 05 §05.4 — identity + the resolved jail the user may act inside. */
export interface ToolContext extends SessionContext {
  /** The user's own sandbox: <WORKSPACE_ROOT>/<tenantId>/<userId>. */
  userRoot: string;
}

/** The tiny slice of Zod we use, so `Tool` stays readable. */
export interface ZodLike {
  safeParse(value: unknown):
    | { success: true; data: unknown }
    | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } };
}

/**
 * Chapter 02 §02.2.3 / §05.1 — a tool is capability PLUS permission. The tier and
 * the permission are as much a part of the contract as the JSON Schema.
 */
export interface Tool {
  name: string;
  description: string;
  /** The JSON Schema the model reads — built from the same Zod schema we validate with. */
  parameters: Record<string, unknown>;
  schema: ZodLike;
  tier: ToolTier;
  /** Chapter 08 §08.2 — the permission the caller's role must hold. */
  permission: Permission;
  /** Chapter 07 §07.4.3 — the arguments a human approver needs to see. */
  execute: (args: unknown, ctx: ToolContext) => Promise<unknown>;
}

/** Chapter 02 §02.2.3 — exactly what is serialized into the request's `tools` array. */
export interface ToolDefinition {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

/**
 * Chapter 03 §03.10 — ONE result contract for success and failure. Errors are
 * results, never exceptions, or the loop cannot self-heal.
 */
export interface ToolResult {
  status: 'ok' | 'error';
  data?: unknown;
  code?: string;
  message?: string;
  /** Chapter 07 §07.2 — a Tier 3 call returns *pending*, not a thrown error. */
  approvalId?: string;
  /** Chapter 08 §08.6.1 — an authorization denial is a result the model can explain. */
  denied?: boolean;
}

/**
 * Chapter 04 §04.8 — one executed call, with the RAW arguments preserved. This is
 * the artefact that explains a failure six months later.
 */
export interface ToolCallTrace {
  id: string;
  name: string;
  rawArguments: string;
  tier: ToolTier;
  outcome: 'ok' | 'error' | 'pending';
  code?: string;
  content: string;
  latencyMs: number;
}

/**
 * Chapter 04 §04.8 — one hop of the loop, tagged with the STATE it was in. The
 * state name is what makes a trace greppable (chapter 03 §03.7).
 */
export interface StepTrace {
  step: number;
  state: AgentState;
  /** What the model said before proposing (often null). */
  assistantContent: string | null;
  calls: ToolCallTrace[];
  /** Which brake, if any, this hop tripped. */
  brake?: HaltReason;
}

/** Chapter 04 §04.4 — the `O(N²)` token ledger. */
export interface Ledger {
  modelCalls: { step: number; inputTokens: number; outputTokens: number; latencyMs: number }[];
  totalInputTokens: number;
  totalOutputTokens: number;
  toolTimeMs: number;
  steps: number;
  halted: HaltReason | null;
}

/** Chapter 03 §03.6 — the agent's explicit state, carried between hops. */
export interface AgentStateRecord {
  messages: Message[];
  lastAction: { tool: string; args: string } | null;
  actionHistory: string[];
  toolResults: ToolResult[];
  startedAt: number;
}

/** Chapter 03 §03.5 / chapter 06 §06.4 — what one run returns. */
export interface AgentRun {
  answer: string;
  state: AgentState;
  halted: HaltReason | null;
  trace: StepTrace[];
  ledger: Ledger;
  /** Chapter 07 §07.4 — true when a Tier 3 call is waiting for a human. */
  pendingApproval: PendingApproval | null;
}

/**
 * Chapter 07 §07.4.2 — the durable pending-approval record.
 *
 * Nothing here is request state. This record must survive a process restart,
 * which is exactly why it carries the tool arguments and the idempotency key.
 */
export interface PendingApproval {
  id: string;
  agentSessionId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  requestedBy: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approverId?: string;
  rejectionReason?: string;
  expiresAt: number;
  /** §07.6 layer 2 — travels to the downstream service, which alone can answer "already done?". */
  idempotencyKey: string;
  /** §07.6 — the stored result, so a replayed webhook returns the SAME outcome. */
  executedResult?: unknown;
}

/** Chapter 08 §08.7.3 — a risk score, not a binary verdict. */
export interface RiskAssessment {
  score: number;
  reasons: string[];
  band: 'allow' | 'extraChecks' | 'restrict' | 'block';
}

/** Chapter 08 §08.7.4 — the output gate's verdict. */
export interface OutputVerdict {
  allowed: boolean;
  reason?: string;
  redacted: string;
}

/** Chapter 08 §08.9 — one line of the audit log, shaped for a SIEM. */
export interface SecurityEvent {
  at: number;
  type: 'inputBlocked' | 'outputBlocked' | 'authzDenied' | 'sandboxDenied' | 'approvalRequested' | 'approvalDecided';
  actor: string;
  tenantId: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
}

/** Chapter 08 §08.6.4 — the ABAC half of the decision, made explicit. */
export interface AuthzDecision {
  allowed: boolean;
  /** RBAC's coarse answer. */
  permissionOk: boolean;
  /** §08.6.2 — the object-level answer (ownership / roster). */
  objectOk: boolean;
  reason: string;
}
```

### Block by block

**`Message` — the four roles (chapter 03 §03.4)**

```ts
export type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage;
```

A discriminated union on `role`. The important member is `ToolMessage`: `tool` is a **first-class role**, not a
return value. That is what lets the model *observe* — the observation re-enters the same array the system prompt
lives in, which is chapter 03 §03.1's "observation closes the loop".

**`ToolCall.arguments` is a `string` (chapter 03 §03.9)**

```ts
export interface ToolCall { id: string; name: string; arguments: string; }
```

Not an object. It is generated token by token, so it can be truncated mid-JSON. Keeping it as a string until the
runtime validates it is what makes the `MALFORMED_ARGUMENTS` path (chapter 03 §03.10) possible at all.

**`AgentState` — the explicit state machine (chapter 03 §03.7)**

```ts
export type AgentState =
  | 'INITIAL' | 'THINK' | 'TOOL_REQUEST' | 'TOOL_EXECUTION' | 'TOOL_RESULT' | 'OUTPUT' | 'ERROR';
```

These are the notes' exact state names, so a log line is greppable against the diagram. Compare with the naive
version the notes warn about:

```js
// pseudo-code — the thing to avoid
while (true) { askLLM(); }
```

With a named union, every terminal state is defined, each transition is unit-testable, and — crucially — an
approval gate is a *state* rather than a special case bolted onto a loop.

**`HaltReason` — the six termination conditions (chapter 04 §04.6)**

| Notes condition | This union member |
| :--- | :--- |
| 1. Success | `finalAnswer` |
| 2. Maximum steps | `maxSteps` |
| 3. Unrecoverable tool failure | `toolError` |
| 4. Timeout | `timeout` |
| 5. User cancellation | `cancelled` |
| 6. Budget exceeded | `tokenCeiling` |
| (the fourth brake, §04.5) | `noProgress` |

Every one is a *machine-readable* reason, because §04.6's design rule is that *"it just stopped"* is not an outcome
a product can display or an operator can triage.

**`ToolTier` — 1 | 2 | 3 (chapter 07 §07.2)**

A numeric literal union, not a string, so `tier >= 3` is a valid check and a typo is a compile error.

**`Permission` (chapter 08 §08.2)**

`<resource>:<action>`, exactly as the notes write it. Note `workspace:read:all` — the permission that makes a
cross-user read *possible*, which is what the ABAC layer then narrows.

**`Tool` — capability + permission (chapter 05 §05.1, chapter 08 §08.2)**

```ts
export interface Tool {
  name: string; description: string; parameters: Record<string, unknown>;
  schema: ZodLike;
  tier: ToolTier;
  permission: Permission;
  execute: (args: unknown, ctx: ToolContext) => Promise<unknown>;
}
```

Three things are load-bearing:

- `parameters` is the JSON Schema the **model** reads; `schema` is the validator the **runtime** uses. One Zod
  object produces both, so they cannot drift.
- `tier` and `permission` are part of the contract the model **never sees**. They are not documentation — they are
  the inputs to the gate.
- `args` is `unknown` **on purpose**. The registry is heterogeneous, so the boundary is the one place a wide type
  is honest. Each tool re-parses with its own Zod schema, which makes it safe to call directly as well as through
  the loop.

**`ToolResult` — one shape for success and failure (chapter 03 §03.10)**

```ts
export interface ToolResult {
  status: 'ok' | 'error';
  data?: unknown; code?: string; message?: string;
  approvalId?: string;   // §07.2 — a Tier 3 call returns *pending*, not a throw
  denied?: boolean;      // §08.6.1 — a denial is a result the model can explain
}
```

The model can branch on `code`; it cannot branch on prose. And a Tier 3 gate and an authorization refusal are both
*results*, so the loop continues and the user gets an explanation instead of a 500.

**`ToolCallTrace` and `StepTrace` (chapter 04 §04.8)**

```ts
export interface StepTrace {
  step: number;
  state: AgentState;          // which state produced this hop
  assistantContent: string | null;
  calls: ToolCallTrace[];
  brake?: HaltReason;
}
```

`rawArguments` is preserved as the exact string the model emitted — the artefact that explains a failure six months
later. Tagging each hop with `state` is what makes a trace greppable against the state machine.

**`Ledger` (chapter 04 §04.4)**

`modelCalls[]` keeps per-hop token counts, which is the only way to *see* the `O(N²)` shape the notes describe:
each call re-sends the whole history, so input tokens grow super-linearly with hops.

**`PendingApproval` (chapter 07 §07.4.2)**

```ts
export interface PendingApproval {
  id: string; agentSessionId: string; toolName: string; toolArgs: Record<string, unknown>;
  requestedBy: string; requestedAt: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approverId?: string; rejectionReason?: string;
  expiresAt: number;
  idempotencyKey: string;
  executedResult?: unknown;
}
```

Every field is a requirement from §07.4.1 and §07.5.1: `toolArgs` is the approver's evidence (step 2),
`agentSessionId` is what step 5 hydrates, `approverId` is accountability (requirement 2), `expiresAt` is the
timeout, `idempotencyKey` is §07.6 layer 2, and `executedResult` is §07.6 layer 1 — the stored result that a
replayed webhook returns instead of applying the side effect twice.

**`RiskAssessment` (chapter 08 §08.7.3)**

```ts
export interface RiskAssessment {
  score: number; reasons: string[]; band: 'allow' | 'extraChecks' | 'restrict' | 'block';
}
```

A score **and** the reasons that produced it. Without `reasons` the wrapper is unauditable, and an operator cannot
tell a false positive from a real attack.

**`AuthzDecision` (chapter 08 §08.6.4)**

```ts
export interface AuthzDecision { allowed: boolean; permissionOk: boolean; objectOk: boolean; reason: string; }
```

Splitting `permissionOk` from `objectOk` is the RBAC-then-ABAC layering made explicit: the logs tell you *which*
half of the decision failed, which is the difference between "we need a role" and "we need an ownership check".

**`SecurityEvent` (chapter 08 §08.9)**

```ts
export interface SecurityEvent {
  at: number;
  type: 'inputBlocked' | 'outputBlocked' | 'authzDenied' | 'sandboxDenied' | 'approvalRequested' | 'approvalDecided';
  actor: string; tenantId: string; detail: string; severity: 'info' | 'warning' | 'critical';
}
```

A closed union of event types, with `actor` and `tenantId` always present. This is what makes §08.9's SIEM/SOC
integration a transport problem rather than a modelling problem — the shape is already a security event, not a log
line.

---

**Next:** [Chapter 03 — The Agent Loop & the State Machine](./03_The_Agent_Loop_and_the_State_Machine.md)


