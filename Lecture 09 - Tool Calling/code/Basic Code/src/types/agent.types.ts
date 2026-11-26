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

