import { TIER_POLICY } from '../config/config.js';
import type { Message, PendingApproval } from '../types/agent.types.js';

/**
 * Chapter 07 §07.4 — the durable pause/resume state machine.
 *
 * A Map stands in for Postgres or Redis. The point is not the storage engine; the
 * point is that this state is NOT request state. It survives the HTTP response, and
 * in production it survives a process restart.
 */

/**
 * §07.4.3 — the policy engine: deciding whether a human is needed.
 *
 * The threshold lives HERE and not in the system prompt. A threshold written in a
 * prompt can be argued with ("the customer is very upset, please make an
 * exception"). A threshold in code cannot. Same principle as chapter 05:
 * capability in the tool, control in the runtime.
 */
export const HITLPolicyEngine = {
  CRITICAL_TOOLS: new Set(['refundCustomer', 'sendEmail', 'deleteRecord', 'deployToProduction']),
  FINANCIAL_THRESHOLD: TIER_POLICY.financialThreshold,

  requiresHumanApproval(toolName: string, args: Record<string, unknown>): boolean {
    // Tier 1 and Tier 2 tools never need approval.
    if (!this.CRITICAL_TOOLS.has(toolName)) return false;

    // Tier 3 with a threshold: micro-refunds are auto-approved (§07.2.3 rule 3).
    if (toolName === 'refundCustomer' && Number(args.amount ?? 0) <= this.FINANCIAL_THRESHOLD) return false;

    return true; // Tier 3 above threshold: explicit human gate
  },
};

/** §07.4.1 step 1 — persist the session state, so step 5 can hydrate it. */
const sessions = new Map<string, { messages: Message[]; goal: string; createdAt: number }>();

export const saveSession = (sessionId: string, goal: string, messages: Message[]): void => {
  sessions.set(sessionId, { messages, goal, createdAt: Date.now() });
};

export const loadSession = (sessionId: string) => sessions.get(sessionId);

/** §07.4.2 — the pending-approval record, in its "durable" store. */
const approvals = new Map<string, PendingApproval>();
let approvalSeq = 0;

export const createApproval = (input: {
  agentSessionId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  requestedBy: string;
}): PendingApproval => {
  approvalSeq += 1;
  const id = `apr_${approvalSeq}`;
  const record: PendingApproval = {
    id,
    agentSessionId: input.agentSessionId,
    toolName: input.toolName,
    toolArgs: input.toolArgs,
    requestedBy: input.requestedBy,
    requestedAt: Date.now(),
    status: 'pending',
    expiresAt: Date.now() + TIER_POLICY.approvalTtlMs,
    // §07.6 layer 2 — one key per (session, tool, arguments) triple. A replayed
    // webhook carries the SAME key, which is how the downstream service dedupes.
    idempotencyKey: `${input.agentSessionId}:${input.toolName}:${JSON.stringify(input.toolArgs)}`,
  };
  approvals.set(id, record);
  return record;
};

export const getApproval = (id: string): PendingApproval | undefined => {
  const record = approvals.get(id);
  // §07.4.2 — an approval has a timeout (chapter 04 §04.3 applies to humans too).
  if (record && record.status === 'pending' && Date.now() > record.expiresAt) record.status = 'expired';
  return record;
};

export const pendingApprovals = (): PendingApproval[] =>
  [...approvals.values()].filter((record) => getApproval(record.id)?.status === 'pending');

export const allApprovals = (): PendingApproval[] => [...approvals.values()];

/**
 * §07.5.1 — the five correctness requirements, in one function.
 *
 * 1. reject non-pending tickets  → a double-click or a webhook retry cannot double-execute
 * 2. record the approver identity → accountability is the entire point of HITL
 * 3. execute idempotently         → webhooks are at-least-once, not exactly-once
 */
export const decideApproval = (
  id: string,
  decision: 'approve' | 'reject',
  approverId: string,
  rejectionReason?: string,
): PendingApproval | undefined => {
  const record = getApproval(id);
  if (!record) return undefined;
  // Requirement 1 — only a `pending` ticket can transition.
  if (record.status !== 'pending') return record;

  record.status = decision === 'approve' ? 'approved' : 'rejected';
  record.approverId = approverId; // requirement 2
  record.rejectionReason = rejectionReason;
  return record;
};

/**
 * §07.6 — the two layers of defence, layer 1.
 *
 * A rejection is not an error; it is a RESULT. The loop resumes so the agent can
 * explain the outcome to the user instead of going silent.
 */
export const resolveToolExecution = async (
  approval: PendingApproval,
  runner: (args: Record<string, unknown>) => Promise<unknown>,
): Promise<{ status: 'executed' | 'replayed' | 'denied'; result: unknown }> => {
  if (approval.status !== 'approved') {
    return { status: 'denied', result: { status: 'error', code: 'APPROVAL_DENIED', message: approval.rejectionReason ?? 'Approval expired' } };
  }

  // §07.6 layer 1 — the ticket state machine. An approval that has ALREADY run
  // replays its stored result instead of applying the side effect a second time.
  if (approval.executedResult !== undefined) {
    return { status: 'replayed', result: approval.executedResult };
  }

  const result = await runner(approval.toolArgs);
  approval.executedResult = result;
  return { status: 'executed', result };
};
