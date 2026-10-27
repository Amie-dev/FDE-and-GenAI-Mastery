/**
 * Chapter 06 §06.10 — THE ERROR CONTRACT.
 *
 * A typed outcome is the right shape for a MODEL failure. But the HTTP layer also
 * has its own failures — a malformed body, an unknown route, a rate limit — and
 * those are genuinely exceptional. This class is the small, closed set of them,
 * so the error middleware never has to guess a status code.
 */

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UNPROCESSABLE'
  | 'PROVIDER_UNAVAILABLE'
  | 'INTERNAL';

const STATUS_FOR: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UNPROCESSABLE: 422,
  PROVIDER_UNAVAILABLE: 502,
  INTERNAL: 500,
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details: unknown;
  public readonly retryable: boolean;

  constructor(code: ErrorCode, message: string, options: { details?: unknown; retryable?: boolean } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_FOR[code];
    this.details = options.details;
    this.retryable = options.retryable ?? false;
  }

  public toBody(): Record<string, unknown> {
    return {
      error: { code: this.code, message: this.message, ...(this.details ? { details: this.details } : {}) },
    };
  }

  /** Chapter 09 §09.8 — the runbook's first question: is this retryable? */
  public static badRequest(message: string, details?: unknown): AppError {
    return new AppError('BAD_REQUEST', message, { details });
  }

  public static notFound(message: string): AppError {
    return new AppError('NOT_FOUND', message);
  }

  public static providerUnavailable(message: string): AppError {
    return new AppError('PROVIDER_UNAVAILABLE', message, { retryable: true });
  }

  public static internal(message: string, details?: unknown): AppError {
    return new AppError('INTERNAL', message, { details });
  }
}

/** Chapter 06 §06.10 — the outcome-to-status table, in one place. */
export const OUTCOME_STATUS: Readonly<Record<string, number>> = Object.freeze({
  ok: 200,
  repaired: 200, // usable — the repair is reported in the body, not as an error
  degraded: 206, // Partial Content: a valid object with explicit unknowns
  refused: 422, // the model declined; do NOT retry
  truncated: 502, // the provider cut the output; raise the budget
  invalid: 502, // repairs exhausted
  failed: 503, // the provider was unreachable after retries
});

/** Chapter 06 §06.10 — whether a caller should retry, per outcome. */
export const OUTCOME_RETRYABLE: Readonly<Record<string, boolean>> = Object.freeze({
  ok: false,
  repaired: false,
  degraded: false,
  refused: false,
  truncated: false,
  invalid: false,
  failed: true,
});
