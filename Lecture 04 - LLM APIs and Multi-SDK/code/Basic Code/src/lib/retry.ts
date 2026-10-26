/**
 * Chapter 06 — rate limits, throttling and retry/backoff.
 * Rule: retry only what is safe to retry, back off exponentially, add jitter, and stop.
 */

/** HTTP statuses where a retry can actually succeed. */
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

/** Network-level failures that are worth another attempt. */
const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
]);

const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8_000;
const MAX_ATTEMPTS = 4;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const statusOf = (error: unknown): number | undefined => {
  const status = (error as { status?: unknown })?.status;
  return typeof status === 'number' ? status : undefined;
};

/** Providers send `Retry-After` (seconds) on 429 — that hint beats any backoff we can guess. */
const retryAfterMs = (error: unknown): number | undefined => {
  const headers = (error as { headers?: Record<string, string> })?.headers;
  const seconds = Number(headers?.['retry-after']);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : undefined;
};

const isRetryable = (error: unknown): boolean => {
  const status = statusOf(error);

  if (status !== undefined) return RETRYABLE_STATUS.has(status);

  const code = (error as { code?: unknown })?.code;
  return (
    (error as { name?: string })?.name === 'APIConnectionError' ||
    (typeof code === 'string' && RETRYABLE_NETWORK_CODES.has(code))
  );
};

/**
 * Exponential backoff with jitter:
 *   500ms → 1000ms → 2000ms (capped at 8s) plus up to 250ms of random jitter so that
 * many concurrent clients do not retry in the same instant ("thundering herd").
 *
 * 401 (bad key) and 413 (budget) are never retried: no amount of waiting fixes them.
 */
export const withRetry = async <T>(operation: () => Promise<T>, label = 'llm-call'): Promise<T> => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error) || attempt >= MAX_ATTEMPTS) throw error;

      const backoffMs = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
      const delayMs = retryAfterMs(error) ?? backoffMs + Math.random() * 250;

      console.warn(
        `↻ ${label}: attempt ${attempt}/${MAX_ATTEMPTS} failed ` +
          `(status ${statusOf(error) ?? 'network'}) — retrying in ${Math.round(delayMs)}ms`,
      );

      await sleep(delayMs);
    }
  }
};
