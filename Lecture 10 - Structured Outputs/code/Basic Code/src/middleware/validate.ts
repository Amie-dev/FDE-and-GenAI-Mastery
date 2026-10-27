import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/config.js';

/**
 * Chapter 02 §02.7.1 / chapter 07 §07.9 — validate BEFORE anything executes.
 *
 * The request body is untrusted input in exactly the same way the model's output
 * is. Both cross a boundary, so both get the same treatment: one schema, one
 * `safeParse`, machine-readable issues on failure.
 */

/** Chapter 09 §09.6 — bound the input, because unbounded input is unbounded cost. */
export const extractBodySchema = z
  .object({
    text: z.string().min(1).max(config.MAX_INPUT_CHARS),
    /** Chapter 06 §06.7.1 — a per-request repair cap, bounded by the configured maximum. */
    maxRepairs: z.coerce.number().int().min(0).max(config.MAX_REPAIRS).optional(),
  })
  .strict();

export type ExtractBody = z.infer<typeof extractBodySchema>;

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
