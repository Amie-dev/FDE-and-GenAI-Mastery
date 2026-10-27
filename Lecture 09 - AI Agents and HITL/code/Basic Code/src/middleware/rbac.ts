import path from 'node:path';
import { WORKSPACE_ROOT } from '../config/config.js';
import type { AuthzDecision, Permission, SessionContext, Tool, ToolContext, UserRole } from '../types/agent.types.js';

/**
 * Chapter 08 §08.2 — RBAC, in the smallest form that is still real.
 *
 * User → Role → Permissions → Resource/Action. Nothing here is a prompt. The model
 * never sees this file's output as instructions; it only ever sees a *filtered*
 * registry (chapter 08 §08.2.2).
 */

/** §08.2.1 — the three canonical roles from the notes. */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  learner: ['workspace:read', 'workspace:write', 'calc:run'],
  instructor: ['workspace:read', 'workspace:write', 'calc:run', 'workspace:read:all'],
  admin: ['workspace:read', 'workspace:write', 'calc:run', 'workspace:read:all', 'billing:refund', 'deploy:run'],
};

/**
 * §08.6.4 — the ABAC fixture. An instructor may read a student's workspace only if
 * that student is enrolled in one of the instructor's courses.
 *
 * This is the notes' worked example, made executable:
 *   Role: Instructor · Permission: student:read · Resource: Student #123
 *   Condition: the student belongs to one of the instructor's courses → ALLOW
 */
export const COURSE_ROSTER: Record<string, { courseId: string; students: string[] }> = {
  'i-1': { courseId: 'c-1', students: ['s-1', 's-2'] },
};

/** §08.2 — the coarse gate. */
export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  ROLE_PERMISSIONS[role]?.includes(permission) ?? false;

export const permissionsFor = (role: UserRole): Permission[] => ROLE_PERMISSIONS[role] ?? [];

/**
 * §08.2.2 — THE important line of the chapter.
 *
 * The registry is filtered by the user's role BEFORE the model ever sees it. A
 * learner's agent literally does not have a `refundCustomer` tool. This is stronger
 * than checking permissions after the model asks, because the capability is never
 * exposed — there is nothing to jailbreak toward.
 */
export const toolsForRole = (tools: Tool[], role: UserRole): Tool[] =>
  tools.filter((tool) => hasPermission(role, tool.permission));

/** §08.3 — the user's own sandbox: <WORKSPACE_ROOT>/<tenantId>/<userId>. */
export const userRootFor = (ctx: SessionContext): string =>
  path.join(WORKSPACE_ROOT, ctx.tenantId, ctx.userId);

/** §08.6.4 — the ABAC predicate. Ownership, or a roster match. */
const objectAllowed = (ctx: SessionContext, ownerId: string): boolean => {
  if (ownerId === ctx.userId) return true; // ownership
  if (!hasPermission(ctx.role, 'workspace:read:all')) return false;
  if (ctx.role === 'admin') return true; // admin: everything (§08.2.1)
  const roster = COURSE_ROSTER[ctx.userId];
  return Boolean(roster && roster.students.includes(ownerId));
};

/**
 * §08.6 — the boundary that decides. RBAC first (coarse), then the object-level
 * check (fine), exactly as §08.6.4 prescribes.
 *
 * Note what this function does NOT do: it never reads the model's output, and the
 * model cannot call it. The model's words are a proposal; this is the decision.
 */
export const authorizeTool = (
  tool: Tool,
  ctx: SessionContext,
  args: Record<string, unknown>,
): AuthzDecision => {
  // 1. RBAC — may this role run this tool at all?
  const permissionOk = hasPermission(ctx.role, tool.permission);
  if (!permissionOk) {
    return {
      allowed: false,
      permissionOk,
      objectOk: false,
      reason: `Role '${ctx.role}' does not hold '${tool.permission}'.`,
    };
  }

  // 2. Object-level — may this role act on THIS object? Only workspace tools carry
  //    an owner argument; everything else has no object to own.
  const owner = typeof args.owner === 'string' ? args.owner : ctx.userId;
  const objectOk = tool.permission.startsWith('workspace:') ? objectAllowed(ctx, owner) : true;
  if (!objectOk) {
    return {
      allowed: false,
      permissionOk,
      objectOk,
      reason: `Object-level check failed: '${owner}' is not yours and you are not enrolled with them.`,
    };
  }

  return { allowed: true, permissionOk, objectOk, reason: 'RBAC + object-level checks passed.' };
};

/** §05.4 — the jail the caller may act inside, after the object-level check. */
export const toolContextFor = (ctx: SessionContext, args: Record<string, unknown>): ToolContext => {
  const owner = typeof args.owner === 'string' ? args.owner : ctx.userId;
  return { ...ctx, userRoot: path.join(WORKSPACE_ROOT, ctx.tenantId, owner) };
};
