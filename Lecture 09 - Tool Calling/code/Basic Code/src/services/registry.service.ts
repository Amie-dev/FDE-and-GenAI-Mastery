import { APPROVAL_REQUIRED_TIER } from '../config/config.js';
import type { PermissionTier, Tool, ToolContext, ToolDefinition } from '../types/agent.types.js';
import { allTools } from './tools.service.js';

/**
 * Chapter 02 §02.6 — the tool registry.
 *
 * One map, keyed by the SAME string the model will emit, built from the SAME
 * collection that produces the wire definitions. That single-source rule is what
 * makes "described but not executable" (and vice versa) impossible.
 */

const registry = new Map<string, Tool>();

for (const tool of allTools) {
  if (registry.has(tool.name)) throw new Error(`Duplicate tool name: ${tool.name}`);
  registry.set(tool.name, tool);
}

export const getTool = (name: string): Tool | undefined => registry.get(name);

export const toolNames = (): string[] => [...registry.keys()];

/** Chapter 02 §02.2 — exactly what goes into the request's `tools` array. */
export const toWireDefinitions = (tools: Tool[] = allTools): ToolDefinition[] =>
  tools.map((tool) => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }));

/**
 * Chapter 08 §08.2.1 — the tier questions, answered per tool and declared once.
 * A `critical` tool is NOT reachable from the loop: it can only produce an
 * approval request (chapter 08 §08.5).
 */
export const tierOf = (tool: Tool): PermissionTier => tool.tier;

export const needsApproval = (tool: Tool): boolean => tool.tier === APPROVAL_REQUIRED_TIER;

/**
 * Chapter 08 §08.1 — identity and permission verification.
 *
 * The session decides who the caller is; the registry decides what that caller may
 * reach. A prompt cannot change either (chapter 08 §08.1.2).
 */
export const isAllowed = (tool: Tool, ctx: ToolContext): boolean => {
  if (!ctx.userId || !ctx.tenantId) return false;
  // Tier 1 and 2 are reachable inside a run; Tier 3 is gated, not forbidden.
  return tool.tier === 'read' || tool.tier === 'write' || tool.tier === 'critical';
};

// ---------------------------------------------------------------------------
// The approval gate (chapter 08 §08.5)
// ---------------------------------------------------------------------------

export interface Approval {
  approvalId: string;
  toolName: string;
  tier: PermissionTier;
  /** The exact arguments, so an approval binds to THIS call and not to "a call". */
  rawArguments: string;
  argsHash: string;
  summary: string;
  requestedBy: string;
  tenantId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
  executedResult?: unknown;
}

const APPROVAL_TTL_MS = 15 * 60 * 1000;
const approvals = new Map<string, Approval>();
let approvalCounter = 0;

/** Chapter 08 §08.5.2 rule 3 — an approval binds to the exact arguments. */
export const hashArgs = (raw: string): string => {
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  return `h${(hash >>> 0).toString(16)}`;
};

/**
 * Deny by default (chapter 08 §08.5.2 rule 2): no approval record → no execution.
 * This function NEVER executes; it only records the request and returns an id.
 */
export const requestApproval = (tool: Tool, rawArguments: string, ctx: ToolContext): Approval => {
  const approvalId = `apr_${++approvalCounter}`;
  const approval: Approval = {
    approvalId,
    toolName: tool.name,
    tier: tool.tier,
    rawArguments,
    argsHash: hashArgs(rawArguments),
    summary: `${tool.name}(${rawArguments}) for ${ctx.userId}@${ctx.tenantId}`,
    requestedBy: ctx.userId,
    tenantId: ctx.tenantId,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + APPROVAL_TTL_MS,
  };
  approvals.set(approvalId, approval);
  return approval;
};

export const getApproval = (approvalId: string): Approval | undefined => {
  const approval = approvals.get(approvalId);
  if (!approval) return undefined;
  // A stale approval must not execute later (chapter 08 §08.5.1).
  if (approval.status === 'pending' && Date.now() > approval.expiresAt) approval.status = 'expired';
  return approval;
};

/** A human decision. Note it is a separate entry point from the agent loop. */
export const decideApproval = (approvalId: string, decision: 'approve' | 'reject'): Approval | undefined => {
  const approval = getApproval(approvalId);
  if (!approval || approval.status !== 'pending') return approval;
  approval.status = decision === 'approve' ? 'approved' : 'rejected';
  return approval;
};

/** Chapter 02 §02.6 / chapter 08 §08.8 — the registry, as the health endpoint sees it. */
export const describeRegistry = (): { name: string; family: string; tier: PermissionTier; timeoutMs: number; cached: boolean }[] =>
  allTools.map((tool) => ({
    name: tool.name,
    family: tool.family,
    tier: tool.tier,
    timeoutMs: tool.timeoutMs ?? 0,
    cached: Boolean(tool.cacheTtlMs),
  }));

export const pendingApprovals = (): Approval[] => [...approvals.values()].filter((a) => a.status === 'pending');
