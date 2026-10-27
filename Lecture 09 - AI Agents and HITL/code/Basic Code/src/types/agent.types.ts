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

