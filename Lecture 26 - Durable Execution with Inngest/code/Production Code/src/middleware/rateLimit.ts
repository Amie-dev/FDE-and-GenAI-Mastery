import { Request, Response, NextFunction } from "express";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 100,
  keyPrefix: "ratelimit",
};

const store = new Map<string, { count: number; resetTime: number }>();

function cleanup() {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.resetTime < now) {
      store.delete(key);
    }
  }
}

setInterval(cleanup, 60_000);

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const cfg = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || "unknown";
    const key = `${cfg.keyPrefix}:${ip}`;

    const now = Date.now();
    let record = store.get(key);

    if (!record || record.resetTime < now) {
      record = { count: 0, resetTime: now + cfg.windowMs };
    }

    record.count++;
    store.set(key, record);

    res.setHeader("X-RateLimit-Limit", cfg.maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", Math.max(0, cfg.maxRequests - record.count).toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000).toString());

    if (record.count > cfg.maxRequests) {
      res.setHeader("Retry-After", Math.ceil((record.resetTime - now) / 1000).toString());
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds.`,
      });
    }

    next();
  };
}