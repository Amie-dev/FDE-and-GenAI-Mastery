import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../lib/logger.js';
import { contextOf } from './request-context.js';

/**
 * Chapter 06 §06.1 — THE HTTP LAYER'S OWN BOUNDARY.
 *
 * Note how LITTLE reaches this middleware. Every model failure — a refusal, a
 * truncation, a shape error, exhausted repairs, an unreachable provider — has
 * already been converted into a typed outcome by the pipeline and mapped to a
 * status by the controller (chapter 06 §06.10).
 *
 * That is the payoff of "outcomes, not exceptions": in a naive implementation a
 * refusal would land here as a 500, indistinguishable from a genuine bug.
 */

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'The requested resource does not exist.' },
  });
};

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const context = contextOf(req);

  if (error instanceof AppError) {
    logger.warn(
      { requestId: context.requestId, tenantId: context.tenantId, code: error.code, status: error.status },
      error.message,
    );
    res.status(error.status).json(error.toBody());
    return;
  }

  // Chapter 09 §09.8 — an unexpected fault. Log the stack, return a stable shape,
  // and never leak internals to the caller.
  const message = error instanceof Error ? error.message : 'unexpected error';
  logger.error(
    {
      requestId: context.requestId,
      tenantId: context.tenantId,
      err: error instanceof Error ? error.stack : String(error),
    },
    'unhandled error',
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: config.NODE_ENV === 'production' ? 'Internal server error.' : message,
    },
  });
};

/** Chapter 09 §09.8 — an async handler's rejection must reach `errorHandler`. */
export const asyncHandler =
  <T>(handler: (req: Request, res: Response) => Promise<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
