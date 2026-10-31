import type { Request, Response, NextFunction } from "express";

/** Simple in-memory rate limiter for abuse prevention. */
const requests = new Map<string, number[]>();
const MAX_PER_WINDOW = 100; // 100 requests per 1 minute
const WINDOW_MS = 60_000;

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "OPTIONS") {
    next();
    return;
  }

  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();

  // Clean old entries
  let timestamps = requests.get(ip);
  if (!timestamps) {
    timestamps = [];
    requests.set(ip, timestamps);
  }
  timestamps = timestamps.filter((t) => now - t < WINDOW_MS);
  requests.set(ip, timestamps);

  if (timestamps.length >= MAX_PER_WINDOW) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  timestamps.push(now);
  next();
}