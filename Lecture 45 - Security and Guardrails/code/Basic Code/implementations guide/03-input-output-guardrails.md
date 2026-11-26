# Chapter 03 — Input & Output Guardrails

## 3.1 `src/middleware/guardrail.middleware.ts`

**File details:** Express middleware implementing the two guardrail layers from Lecture 31 notes (Ch. 07 & Ch. 08):
1. **Input guardrail** — masks PII (email) in the request body before it reaches the app/logs.
2. **Output guardrail** — redacts any PII that leaks in the response before it reaches the user.

**Command:** none (registered in `src/index.ts`).

**Full code:**
```typescript
import { Request, Response, NextFunction } from 'express';

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
```

**Block-by-block explanation:**
- `EMAIL_REGEX` — simple pattern that matches an email address. (The notes stress masking PII early; production would use a dedicated PII library.)
- `inputGuardrail` — runs before the route handler. If `req.body.message` is a string, it replaces every email with `[EMAIL]`. Then calls `next()`. This means the raw email never enters application logs or the LLM pipeline.
- `outputGuardrail` — wraps `res.send`. Before the response body is sent, any email-like string is replaced with `[REDACTED]`. This catches PII that the model might have leaked into its output (output validation from Ch. 08).
- Both call `next()` so Express continues the middleware chain.

**How it works (defense in depth):** Input masking protects data in transit/logs; output redaction protects data leaving the system. If one layer misses PII, the other catches it — exactly the layered model in Ch. 07.
