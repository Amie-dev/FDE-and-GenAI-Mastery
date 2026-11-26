import type * as express from "express";
import { Request, Response, NextFunction } from "express";
import { config } from "./config";

/** Optional API-key authentication middleware. */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  if (config.NODE_ENV === "test") {
    next();
    return;
  }

  const provided = req.headers["x-api-key"];
  const expected = process.env.API_KEY;

  if (!expected) {
    next();
    return;
  }

  if (!provided || provided !== expected) {
    res.status(401).json({ error: "Invalid or missing API key" });
    return;
  }

  next();
}

export default apiKeyAuth;