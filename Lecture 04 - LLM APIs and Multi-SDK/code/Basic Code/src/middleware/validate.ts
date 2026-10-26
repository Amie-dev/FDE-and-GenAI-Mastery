import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

/**
 * Chapter 03 — the request shape *is* the privilege boundary:
 * `system` is application-owned, `message` is untrusted user data, and history is
 * only allowed to contain user/assistant turns — never a second system turn.
 */
export const chatRequestSchema = z.object({
  system: z
    .string()
    .min(1)
    .max(4_000)
    .default('You are a concise assistant. Answer in at most 3 sentences.'),
  message: z.string().min(1, 'message is required.').max(8_000, 'message exceeds 8,000 characters.'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(8_000),
      }),
    )
    .max(20, 'History is capped at 20 turns — trim it or summarise it.')
    .default([]),
});

/**
 * Chapter 08 — one validation layer for every route.
 * Invalid payloads are rejected with HTTP 400 before any billable token is spent.
 */
export const validateBody =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    req.body = parsed.data;
    next();
  };
