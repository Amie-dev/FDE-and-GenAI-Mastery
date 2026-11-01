import { Request, Response, NextFunction } from 'express';

/**
 * Guardrail Middleware (Lecture 31 — Ch. 07 & Ch. 08)
 *
 * Defense-in-depth layers:
 * 1. Input guardrail — mask PII before it reaches the app/logs/LLM.
 * 2. Output guardrail — redact any PII that leaks in the response.
 *
 * Note: email regex is a simple demo. Production uses a dedicated PII library.
 */
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

export function inputGuardrail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.body && typeof req.body.message === 'string') {
    req.body.message = req.body.message.replace(EMAIL_REGEX, '[EMAIL]');
  }
  next();
}

export function outputGuardrail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const send = res.send;
  res.send = function (body: any) {
    if (typeof body === 'string') {
      body = body.replace(EMAIL_REGEX, '[REDACTED]');
    }
    return send.call(this, body);
  };
  next();
}