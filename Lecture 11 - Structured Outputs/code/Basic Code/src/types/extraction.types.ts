import type { EnforcementName } from '../config/config.js';

/**
 * Chapter 06 §06.5 — a validation issue is DATA, not an exception.
 *
 * `path + message` is exactly what a repair prompt needs (chapter 06 §06.8) and
 * exactly what a metric can aggregate (chapter 09 §09.2). A thrown exception can
 * be neither.
 */
export interface Issue {
  path: string;
  message: string;
  /** Chapter 06 §06.6 — `block` stops the pipeline, `review` only flags it. */
  severity: Severity;
}

export type Severity = 'block' | 'review';

/** Chapter 06 §06.3 — the eight-class taxonomy, reduced to the classes this lab can hit. */
export type FailureReason = 'refused' | 'truncated' | 'parse_error' | 'shape_error' | 'timeout';

/**
 * Chapter 06 §06.10 — outcomes are modelled explicitly.
 *
 * A system with only "success" and "exception" cannot report *why* it failed,
 * cannot route failures differently, and cannot measure anything.
 */
export type Outcome<T> =
  | { kind: 'ok'; value: T; attempts: number; enforcement: EnforcementName }
  | { kind: 'repaired'; value: T; attempts: number; issues: Issue[]; enforcement: EnforcementName }
  | { kind: 'degraded'; value: T; reason: string; attempts: number }
  | { kind: 'refused'; reason: string; attempts: number }
  | { kind: 'truncated'; raw: string; attempts: number }
  | { kind: 'invalid'; issues: Issue[]; raw: string; attempts: number };

/**
 * Chapter 09 §09.6 — one trace object per ATTEMPT.
 *
 * Note what is logged: field PATHS and error TYPES, never values. The raw output
 * may contain personal data, so it belongs in a short-retention debug store, not
 * in general application logs.
 */
export interface StructuredTrace {
  traceId: string;
  task: 'meeting_extraction';
  schemaVersion: string;
  model: string;
  attempt: number;
  enforcement: EnforcementName;
  outcome: 'ok' | 'repaired' | 'degraded' | 'refused' | 'truncated' | 'invalid';
  issues: { path: string; type: string }[];
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  semanticFlags: string[];
}

/** Chapter 09 §09.2 — the twelve metrics, reduced to the six this lab can compute. */
export interface MetricsSnapshot {
  calls: number;
  attempts: number;
  firstPassValidityRate: number;
  repairRate: number;
  finalFailureRate: number;
  refusalRate: number;
  semanticFlagRate: number;
  p95LatencyMs: number;
  issueDistribution: { path: string; type: string; count: number }[];
  byEnforcement: Record<string, { calls: number; firstPassValid: number; validityRate: number }>;
}

/** The shape of what the model is asked to return, before validation. */
export interface RawModelResponse {
  text: string;
  refused: boolean;
  truncated: boolean;
  inputTokens: number;
  outputTokens: number;
  finishReason: string;
}
