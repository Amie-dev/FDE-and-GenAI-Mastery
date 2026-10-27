import { setTimeout as delay } from 'node:timers/promises';
import { RELIABILITY } from '../config/env.js';
import { ProviderError, type TransportFailure } from '../domain/outcome.js';
import { logger } from './logger.js';

/**
 * Chapter 06 §06.3.1 — RETRY WITH BACKOFF, AND A BUDGET.
 *
 * Three rules the basic lab did not need and production does:
 *   1. retry only the classes that can succeed on a second try (chapter 06 §06.3);
 *   2. cap the TOTAL time spent, not just the attempt count — a stampede from one
 *      request is how a provider outage becomes your outage;
 *   3. jitter the delay, so a fleet of instances does not retry in lockstep.
 */

export interface RetryPolicy {
  readonly attempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly budgetMs: number;
}

export const DEFAULT_RETRY: RetryPolicy = Object.freeze({
  attempts: RELIABILITY.maxTransportRetries,
  baseDelayMs: RELIABILITY.retryBaseDelayMs,
  maxDelayMs: 2_000,
  budgetMs: RELIABILITY.providerTimeoutMs * 2,
});

/** Full jitter: a uniform draw in [0, exponential]. Decorrelates retries. */
const backoff = (attempt: number, policy: RetryPolicy): number => {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempt - 1));
  return Math.floor(Math.random() * exponential);
};

export const isRetryable = (error: unknown): error is ProviderError =>
  error instanceof ProviderError && error.retryable;

/**
 * Chapter 06 §06.3.1 — the transport retry, deliberately separate from the repair
 * loop. A retry repeats the SAME request; a repair CHANGES the input. Conflating
 * them is how a cost incident starts.
 */
export const withRetry = async <T>(
  operation: (attempt: number) => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY,
): Promise<T> => {
  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= policy.attempts + 1; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt > policy.attempts) break;

      const waitMs = error.retryAfterMs ?? backoff(attempt, policy);
      if (Date.now() - startedAt + waitMs > policy.budgetMs) {
        logger.warn({ attempt, waitMs, budgetMs: policy.budgetMs }, 'retry budget exhausted');
        break;
      }

      logger.warn({ attempt, waitMs, failure: error.failure }, 'retrying provider call');
      await delay(waitMs);
    }
  }

  throw lastError;
};

/**
 * Chapter 09 §09.5.2 — THE CIRCUIT BREAKER.
 *
 * When a provider is down, retrying every request makes the outage worse for
 * everyone, including the requests that could have succeeded. The breaker fails
 * fast with a typed `unavailable` instead, which the fallback ladder already
 * knows how to handle (chapter 06 §06.9).
 */
export type CircuitState = 'closed' | 'open' | 'half_open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly threshold: number = RELIABILITY.circuitFailureThreshold,
    private readonly resetMs: number = RELIABILITY.circuitResetMs,
    private readonly name = 'provider',
  ) {}

  public current(): CircuitState {
    if (this.state === 'open' && Date.now() - this.openedAt >= this.resetMs) {
      this.state = 'half_open';
    }
    return this.state;
  }

  /** Chapter 09 §09.8 — the readiness probe reads this, not a socket check. */
  public healthy(): boolean {
    return this.current() !== 'open';
  }

  public onSuccess(): void {
    if (this.state !== 'closed') logger.info({ breaker: this.name }, 'circuit closed');
    this.state = 'closed';
    this.failures = 0;
  }

  public onFailure(): void {
    this.failures += 1;
    if (this.state === 'half_open' || this.failures >= this.threshold) {
      this.state = 'open';
      this.openedAt = Date.now();
      logger.error({ breaker: this.name, failures: this.failures }, 'circuit opened');
    }
  }

  /** Fail fast: the caller gets a typed, retryable-later failure. */
  public guard(): void {
    const state = this.current();
    if (state === 'open') {
      throw new ProviderError('unavailable', `circuit breaker open for ${this.name}`, { retryable: false });
    }
  }
}

/** Chapter 06 §06.3.1 — a wall-clock deadline for one logical call. */
export const deadline = (ms: number): { signal: AbortSignal; clear: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
};

/** Chapter 06 §06.3 — one place maps a thrown transport error to a typed failure. */
export const classifyTransportError = (error: unknown): ProviderError => {
  if (error instanceof ProviderError) return error;

  const status = (error as { status?: number; response?: { status?: number } })?.status
    ?? (error as { response?: { status?: number } })?.response?.status;
  const message = error instanceof Error ? error.message : String(error);

  const byStatus: Record<number, TransportFailure> = {
    401: 'unauthorised',
    403: 'unauthorised',
    408: 'timeout',
    429: 'rate_limited',
    500: 'unavailable',
    502: 'unavailable',
    503: 'unavailable',
    504: 'unavailable',
  };

  if (typeof status === 'number' && byStatus[status]) {
    return new ProviderError(byStatus[status], message, { retryable: status !== 401 && status !== 403 });
  }

  if (/abort|timeout/i.test(message)) return new ProviderError('timeout', message);
  return new ProviderError('provider_error', message, { retryable: false });
};
