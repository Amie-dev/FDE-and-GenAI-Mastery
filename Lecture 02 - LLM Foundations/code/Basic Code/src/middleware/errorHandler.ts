import type { NextFunction, Request, Response } from "express";

/** An error that carries an HTTP status, so the handler can send it as-is. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** A 400 that the caller caused - a missing field, a wrong type. */
export const badRequest = (message: string): HttpError => new HttpError(400, message);

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

/**
 * Express 4 does not catch rejected promises, so a thrown error inside an async
 * handler would hang the request. This wrapper sends it to the error handler.
 */
export const asyncHandler =
  (handler: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

/** Unknown route -> a JSON 404, never an HTML page. */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

/** The last middleware in the chain: one place that turns any error into JSON. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Unexpected error";
  res.status(status).json({ error: message });
}
