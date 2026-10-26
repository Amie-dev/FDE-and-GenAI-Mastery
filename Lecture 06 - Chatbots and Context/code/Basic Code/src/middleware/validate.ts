import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/config.js';

/**
 * Chapter 07 §07.3 — the request shape IS the first guardrail.
 * Invalid payloads are rejected with HTTP 400 before any token is spent.
 */

/** Chapter 01 §01.11 — who owns the session. In production this is a JWT claim. */
export const requireUserId = (req: Request): string => {
  const userId = req.header('x-user-id');
  if (!userId) {
    throw Object.assign(new Error('Send an x-user-id header. A session id is a capability; ownership is always checked.'), {
      status: 401,
    });
  }
  return userId;
};

export const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(config.MAX_INPUT_CHARS),
});

export const previewRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(config.MAX_INPUT_CHARS),
});

/** Chapter 04 §04.9 — facts are typed and categorised, with provenance. */
export const memoryRequestSchema = z.object({
  category: z.enum(['preference', 'constraint', 'identity']).default('preference'),
  content: z.string().min(3).max(400),
  source: z.enum(['explicit-user', 'inferred']).default('explicit-user'),
  expiresInDays: z.coerce.number().int().positive().max(3650).optional(),
});

/** Chapter 02 §02.5 — inputs for the O(N^2) projection. */
export const projectionRequestSchema = z.object({
  turns: z.coerce.number().int().min(1).max(500).default(50),
  systemTokens: z.coerce.number().int().positive().default(900),
  expansionPerTurn: z.coerce.number().int().positive().default(220),
  windowTurns: z.coerce.number().int().positive().default(6),
});

/** Chapter 07 §07.3 — one validation layer for every route. */
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
