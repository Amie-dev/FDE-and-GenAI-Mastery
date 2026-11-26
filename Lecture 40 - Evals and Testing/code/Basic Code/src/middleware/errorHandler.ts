// middleware/errorHandler.ts — Centralised error handling
import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("[error]", err.message);
  res.status(500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
}