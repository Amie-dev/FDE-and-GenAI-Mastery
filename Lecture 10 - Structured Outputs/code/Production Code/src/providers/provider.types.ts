import type { EnforcementName } from '../config/env.js';
import type { ProviderResponse } from '../domain/outcome.js';
import type { WireTarget } from '../domain/meeting.schema.js';

/**
 * Chapter 04 §04.11 — THE PROVIDER PORT (hexagonal architecture).
 *
 * Everything above this interface is pure domain logic: the pipeline, the
 * semantic rules, the repair loop, the metrics. Everything below it is a vendor.
 * That split is what lets the evaluation harness replay the production code path
 * against a deterministic provider and produce reproducible numbers (chapter 09
 * §09.4: "uses the production code path").
 */

export interface CompletionRequest {
  /** Chapter 03 §03.4.1 — the judgement half of the contract. */
  readonly system: string;
  /** The ORIGINAL user text. Never mutated, so every attempt sees the same input. */
  readonly user: string;
  /** Chapter 06 §06.8 — the repair block, appended as a FOLLOW-UP turn. */
  readonly repair?: string;
  readonly enforcement: EnforcementName;
  readonly wireTarget: WireTarget;
  /** Chapter 09 §09.5 — bounded output, because truncation is a real failure mode. */
  readonly maxOutputTokens: number;
  readonly temperature: number;
  /** Chapter 09 §09.6 — carried into every log line so a call is traceable. */
  readonly traceId: string;
  readonly tenantId: string;
  /** Chapter 06 §06.3.1 — a per-call deadline, not just a per-socket timeout. */
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}

export interface ProviderPort {
  readonly name: string;
  readonly model: string;
  /** Chapter 05 §05.2 — the one call. It never validates and never repairs. */
  complete(request: CompletionRequest): Promise<ProviderResponse>;
  /** Chapter 09 §09.8 — a cheap liveness signal for the readiness probe. */
  healthy(): boolean;
}
