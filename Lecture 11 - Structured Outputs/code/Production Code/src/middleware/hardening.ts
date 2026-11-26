import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { HTTP } from '../config/env.js';

/**
 * Chapter 09 §09.5.2 — BLAST-RADIUS CONTROLS.
 *
 * Two of the notes' operational concerns, implemented as middleware:
 *
 *   - a request rate limit per client, because a retry storm or a runaway client
 *     is a cost incident before it is a performance problem;
 *   - security headers, because an API that returns JSON should still not be
 *     embeddable, sniffable or cacheable by accident.
 *
 * Both are deliberately boring. Operational controls should be boring.
 */

export const securityHeaders = helmet({
  contentSecurityPolicy: false, // a JSON API serves no documents
  crossOriginEmbedderPolicy: false,
});

export const rateLimiter = rateLimit({
  windowMs: HTTP.rateLimitWindowMs,
  max: HTTP.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  // Chapter 06 §06.10 — the limit is a typed error, not a bare 429 body.
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests. Limit is ${HTTP.rateLimitMax} per ${HTTP.rateLimitWindowMs} ms.`,
        retryable: true,
      },
    });
  },
});

/**
 * Chapter 09 §09.5 — the extraction endpoint is the expensive one, so it gets its
 * own, tighter budget. A separate limiter is a one-line change here and would be
 * a refactor if the limits were hard-coded in a route.
 */
export const extractionRateLimiter = rateLimit({
  windowMs: HTTP.rateLimitWindowMs,
  max: Math.max(10, Math.floor(HTTP.rateLimitMax / 2)),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Extraction rate limit reached. Retry after the window resets.',
        retryable: true,
      },
    });
  },
});
