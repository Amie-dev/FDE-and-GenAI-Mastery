import type { EnforcementName } from '../config/env.js';
import type { Issue } from './issues.js';

/**
 * Chapter 06 §06.10 — OUTCOMES, NOT EXCEPTIONS.
 *
 * A discriminated union with exactly seven members. Every one of them has a
 * different correct response (chapter 06 §06.3), and every one is countable.
 *
 * The type system does real work here:
 *   - `ok`, `repaired` and `degraded` carry a `value` — a usable object;
 *   - `refused`, `truncated`, `invalid` and `failed` do NOT, so a caller cannot
 *     accidentally read a field from a response that never produced one.
 */
export type Outcome<T> =
  | {
      readonly kind: 'ok';
      readonly value: T;
      readonly attempts: number;
      readonly enforcement: EnforcementName;
      readonly cached: boolean;
      readonly latencyMs: number;
    }
  | {
      readonly kind: 'repaired';
      readonly value: T;
      readonly attempts: number;
      readonly issues: readonly Issue[];
      readonly enforcement: EnforcementName;
      readonly cached: boolean;
      readonly latencyMs: number;
    }
  | {
      readonly kind: 'degraded';
      readonly value: T;
      readonly reason: string;
      readonly issues: readonly Issue[];
      readonly attempts: number;
      readonly cached: boolean;
      readonly latencyMs: number;
    }
  | { readonly kind: 'refused'; readonly reason: string; readonly attempts: number; readonly latencyMs: number }
  | { readonly kind: 'truncated'; readonly attempts: number; readonly latencyMs: number }
  | { readonly kind: 'invalid'; readonly issues: readonly Issue[]; readonly attempts: number; readonly latencyMs: number }
  | { readonly kind: 'failed'; readonly reason: string; readonly attempts: number; readonly latencyMs: number };

/** The outcome kinds that carry a usable object. */
export const VALUE_BEARING = ['ok', 'repaired', 'degraded'] as const;
export type ValueBearingKind = (typeof VALUE_BEARING)[number];

export const carriesValue = <T>(
  outcome: Outcome<T>,
): outcome is Extract<Outcome<T>, { kind: ValueBearingKind }> =>
  (VALUE_BEARING as readonly string[]).includes(outcome.kind);

/** Chapter 09 §09.2 — `degraded` and `invalid` are the two ways a call can end unusable. */
export const isFailure = <T>(outcome: Outcome<T>): boolean =>
  outcome.kind === 'degraded' || outcome.kind === 'invalid' || outcome.kind === 'failed';

/** Chapter 09 §09.2 — the first-pass predicate, in one place so it cannot drift. */
export const isFirstPassValid = <T>(outcome: Outcome<T>): boolean =>
  outcome.kind === 'ok' && outcome.attempts === 1 && !('cached' in outcome ? outcome.cached : false);

/**
 * Chapter 09 §09.2 — the trace, one per ATTEMPT.
 *
 * Note what is absent: there is no field for raw text or for a value. The privacy
 * rule from chapter 09 §09.6 is structural — the trace cannot leak a value
 * because it has nowhere to put one.
 */
export interface Trace {
  readonly traceId: string;
  readonly tenantId: string;
  readonly task: string;
  readonly schemaVersion: string;
  readonly model: string;
  readonly provider: string;
  readonly attempt: number;
  readonly enforcement: EnforcementName;
  readonly outcome: string;
  readonly issues: ReadonlyArray<{ readonly path: string; readonly type: string }>;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencyMs: number;
  readonly semanticFlags: readonly string[];
  readonly cached: boolean;
  readonly at: string;
}

/** Chapter 06 §06.10 — the normalised provider response, before any validation. */
export interface ProviderResponse {
  readonly text: string;
  readonly refused: boolean;
  readonly truncated: boolean;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly finishReason: string;
  readonly enforcement: EnforcementName;
  readonly model: string;
  readonly provider: string;
}

/** Chapter 06 §06.3 — the transport-level failure classes the adapter can raise. */
export type TransportFailure = 'timeout' | 'rate_limited' | 'unavailable' | 'unauthorised' | 'provider_error';

export class ProviderError extends Error {
  public readonly failure: TransportFailure;
  public readonly retryable: boolean;
  public readonly retryAfterMs: number | undefined;

  constructor(failure: TransportFailure, message: string, options: { retryable?: boolean; retryAfterMs?: number } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.failure = failure;
    this.retryable = options.retryable ?? (failure === 'timeout' || failure === 'rate_limited' || failure === 'unavailable');
    this.retryAfterMs = options.retryAfterMs;
  }
}
