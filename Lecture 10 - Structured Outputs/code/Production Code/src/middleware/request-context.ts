import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HTTP } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

/**
 * Chapter 07 §07.9 — THE REQUEST BODY IS UNTRUSTED INPUT.
 *
 * The same discipline as the model's output, applied at the other boundary: one
 * schema, one `safeParse`, machine-readable issues. The handler then works with
 * coerced, validated data and never with `req.body` as received.
 */

export const extractRequestSchema = z
  .object({
    text: z.string().min(1).max(HTTP.maxInputChars),
    /** Chapter 06 §06.7.1 — a caller may LOWER the repair budget, never raise it. */
    maxRepairs: z.coerce.number().int().min(0).max(3).optional(),
    /** Chapter 04 §04.7.1 — the caller's zone, so "tomorrow" resolves correctly. */
    timeZone: z.string().min(1).max(64).optional(),
  })
  .strict();

export type ExtractRequest = z.infer<typeof extractRequestSchema>;

/** Chapter 09 §09.6 — a request id, so one call is traceable across layers. */
export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = String(req.header('x-request-id') ?? `req_${randomUUID().slice(0, 12)}`);
  const tenantId = String(req.header('x-tenant-id') ?? 'public');

  res.setHeader('x-request-id', requestId);
  // Chapter 05 §05.8.1 — the tenant scopes the cache and the traces. A real
  // deployment derives this from an authenticated session, never from a header.
  (req as Request & { context: { requestId: string; tenantId: string } }).context = { requestId, tenantId };
  next();
};

export const contextOf = (req: Request): { requestId: string; tenantId: string } =>
  (req as Request & { context?: { requestId: string; tenantId: string } }).context ?? {
    requestId: 'unknown',
    tenantId: 'public',
  };

/** Chapter 07 §07.9 — one validation layer for every route. */
export const validateBody =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body ?? {});

    if (!parsed.success) {
      next(AppError.badRequest('request body failed validation', parsed.error.flatten().fieldErrors));
      return;
    }

    req.body = parsed.data;
    next();
  };
