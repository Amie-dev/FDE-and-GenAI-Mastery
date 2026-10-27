import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/config.js';
import type { SessionContext, UserRole } from '../types/agent.types.js';

/**
 * Chapter 02 §02.3 / §03.9 — validate BEFORE anything executes.
 *
 * The request body is untrusted input in exactly the same way the model's
 * `arguments` are. Both cross the same boundary, so both get the same treatment.
 */

export const agentRunSchema = z.object({
  goal: z.string().min(1).max(config.MAX_INPUT_CHARS),
  /** Chapter 04 §04.2 — a per-request step budget, bounded by the configured maximum. */
  maxSteps: z.coerce.number().int().min(1).max(config.MAX_STEPS).optional(),
  /** Chapter 04 §04.3 — a per-request deadline, bounded by the configured maximum. */
  timeoutMs: z.coerce.number().int().min(1).max(config.REQUEST_TIMEOUT_MS).optional(),
  /** Chapter 04 §04.6 condition 5 — user cancellation. */
  cancelAfterMs: z.coerce.number().int().min(0).optional(),
});

/** §08.6.2 — `owner` is a RESOURCE identifier, not an identity. It triggers the object-level check. */
export const workspaceSchema = z.object({
  path: z.string().min(1).max(config.MAX_PATH_LENGTH),
  content: z.string().default(''),
  owner: z.string().min(1).optional(),
});

/** §07.5 — the resumption webhook's body. */
export const resumeSchema = z.object({
  approvalId: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
  approverId: z.string().min(1).default('manager-1'),
});

/** §08.7 — scan an arbitrary input, and optionally an output. */
export const guardScanSchema = z.object({
  input: z.string().default(''),
  response: z.string().optional(),
});

/** One validation layer for every route. */
export const validateBody =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }

    req.body = parsed.data;
    next();
  };

const ROLES: UserRole[] = ['learner', 'instructor', 'admin'];

/**
 * Chapter 08 §08.3 — identity comes from the SESSION, never from a tool argument
 * and never from the model. Headers stand in for an auth middleware; the
 * principle is the point: authentication happens before the LLM is involved.
 */
export const sessionContext = (req: Request): SessionContext => {
  const role = String(req.header('x-role') ?? 'learner') as UserRole;
  return {
    userId: String(req.header('x-user-id') ?? 's-1'),
    tenantId: String(req.header('x-tenant-id') ?? 'tenant-a'),
    role: ROLES.includes(role) ? role : 'learner',
  };
};
