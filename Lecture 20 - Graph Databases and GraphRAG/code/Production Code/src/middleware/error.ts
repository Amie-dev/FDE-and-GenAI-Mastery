import type { Request, Response, NextFunction } from "express";
import { logger } from "./logging";

/** Global error handler — ensures no stack leak to client. */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error("Unhandled error", { message: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
}

export default errorHandler;