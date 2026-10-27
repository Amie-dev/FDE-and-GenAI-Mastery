import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/config.js';
import type { ToolChoice } from '../types/agent.types.js';

/**
 * Chapter 06 §06.5 — validate BEFORE anything executes.
 *
 * The request body is untrusted input in exactly the same way the model's
 * `arguments` are. Both cross the same boundary, so both get the same treatment.
 */

/** Chapter 07 §07.2 — the four routing policies, as the API accepts them. */
const toolChoiceSchema = z
  .union([z.enum(['auto', 'required', 'none']), z.string().regex(/^[a-z][A-Za-z0-9]*$/)])
  .default('auto');

export const agentRunSchema = z.object({
  goal: z.string().min(1).max(config.MAX_INPUT_CHARS),
  maxSteps: z.coerce.number().int().min(1).max(20).optional(),
  /** Chapter 05 §05.7 — a per-request deadline, bounded by the configured maximum. */
  timeoutMs: z.coerce.number().int().min(500).max(config.REQUEST_TIMEOUT_MS).optional(),
  toolChoice: toolChoiceSchema,
});

/** Chapter 06 §06.5 — the RAW argument string, so you can exercise the parse path. */
export const toolCallSchema = z.object({
  arguments: z.string().default('{}'),
});

export const approvalSchema = z.object({
  decision: z.enum(['approve', 'reject']),
});

/** Chapter 08 §08.2.2 — the routing policy, in the one shape the engine wants. */
export const toToolChoice = (value: string): ToolChoice => {
  if (value === 'auto' || value === 'required' || value === 'none') return value;
  return { name: value }; // a forced, named tool (chapter 07 §07.2)
};

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

/**
 * Chapter 08 §08.2.2 — identity comes from the SESSION, never from a tool argument
 * and never from the model. Headers stand in for an auth middleware here; the
 * principle is the point.
 */
export const sessionContext = (req: Request): { userId: string; tenantId: string } => ({
  userId: String(req.header('x-user-id') ?? 'user-1'),
  tenantId: String(req.header('x-tenant-id') ?? 'tenant-a'),
});
