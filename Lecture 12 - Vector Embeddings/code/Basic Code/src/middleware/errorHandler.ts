// middleware/errorHandler.ts — Centralised error handling

import { Request, Response, NextFunction, ErrorRequestHandler } from "express";

// Express error-handling middleware signature:
// (err, req, res, next) — note the 4 arguments
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(`[error] ${err.message}`);

  // If the client already received a status (e.g. 404 via route), don't
  // overwrite it. Otherwise default to 500.
  const status = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(status).json({
    success: false,
    error: err.message || "Internal server error",
    path: req.path,
  });
};
