import { OBSERVABILITY } from '../config/env.js';
import { issueKey } from '../domain/issues.js';
import type { Outcome, Trace } from '../domain/outcome.js';
import { isFailure, isFirstPassValid } from '../domain/outcome.js';
import { DebugStore } from '../lib/logger.js';

/**
 * Chapter 09 §09.2 — THE METRICS SERVICE.
 *
 * Two buffers, and the distinction between them is the single most common
 * mistake in structured-output observability:
 *
 *   - TRACES are per ATTEMPT: what failed, where, how long, how many tokens.
 *   - CALLS are per CALL: was it valid first time, did it need a repair, how did
 *     it end.
 *
 * Remembering a summary per attempt inflates `calls`, deflates first-pass
 * validity and corrupts the repair rate. `attempts >= calls` is the invariant.
 */

export interface CallSummary {
  readonly traceId: string;
  readonly tenantId: string;
  readonly attempts: number;
  readonly finalOutcome: string;
  readonly enforcement: string;
  readonly totalLatencyMs: number;
  readonly flagged: boolean;
  readonly cached: boolean;
  readonly firstPassValid: boolean;
  readonly failed: boolean;
}

export interface MetricsSnapshot {
  readonly calls: number;
  readonly attempts: number;
  readonly firstPassValidityRate: number;
  readonly repairRate: number;
  readonly finalFailureRate: number;
  readonly refusalRate: number;
  readonly truncationRate: number;
  readonly semanticFlagRate: number;
  readonly cacheHitRate: number;
  readonly p50LatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly issueDistribution: ReadonlyArray<{ readonly path: string; readonly type: string; readonly count: number }>;
  readonly byEnforcement: Readonly<
    Record<string, { readonly calls: number; readonly firstPassValid: number; readonly validityRate: number }>
  >;
  readonly byOutcome: Readonly<Record<string, number>>;
  readonly cost: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly repairMultiplier: number;
    readonly schemaTokenCost: number;
    readonly estimatedCallsAvoided: number;
  };
}

const percentile = (sorted: readonly number[], fraction: number): number => {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index] ?? 0;
};

export class MetricsService {
  private readonly traces: Trace[] = [];
  private readonly calls: CallSummary[] = [];
  private readonly debug: DebugStore;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(private readonly bufferSize: number = OBSERVABILITY.traceBufferSize) {
    this.debug = new DebugStore(OBSERVABILITY.debugStoreMaxEntries);
  }

  /** Chapter 09 §09.6 — one trace per attempt. Paths and types, never values. */
  public recordTrace(trace: Trace): void {
    this.traces.push(trace);
    while (this.traces.length > this.bufferSize) this.traces.shift();
  }

  /** Chapter 09 §09.2 — exactly one summary per call, written at the single exit point. */
  public recordCall<T>(input: {
    traceId: string;
    tenantId: string;
    outcome: Outcome<T>;
    totalLatencyMs: number;
    flagged: boolean;
    cached: boolean;
    enforcement: string;
  }): void {
    this.calls.push({
      traceId: input.traceId,
      tenantId: input.tenantId,
      attempts: input.outcome.attempts,
      finalOutcome: input.outcome.kind,
      enforcement: input.enforcement,
      totalLatencyMs: input.totalLatencyMs,
      flagged: input.flagged,
      cached: input.cached,
      firstPassValid: isFirstPassValid(input.outcome),
      failed: isFailure(input.outcome),
    });
    while (this.calls.length > this.bufferSize) this.calls.shift();
  }

  public recordCache(hit: boolean): void {
    if (hit) this.cacheHits += 1;
    else this.cacheMisses += 1;
  }

  /**
   * Chapter 09 §09.6.1 — the DEBUG store is opt-in and bounded. Raw text lives
   * here, behind a flag, and never in the metrics or the general log.
   */
  public recordDebug(traceId: string, tenantId: string, raw: string): void {
    if (!OBSERVABILITY.debugStoreEnabled) return;
    this.debug.put({ traceId, tenantId, at: new Date().toISOString(), raw });
  }

  public debugRecord(traceId: string): string | undefined {
    return this.debug.get(traceId)?.raw;
  }

  public recentTraces(limit = 50): readonly Trace[] {
    return this.traces.slice(-limit).reverse();
  }

  /** Chapter 09 §09.5 — the schema's fixed per-call input overhead, measured. */
  public schemaTokenCost(schemaJson: unknown): number {
    return Math.ceil(JSON.stringify(schemaJson).length / 4);
  }

  public snapshot(schemaTokenCost: number): MetricsSnapshot {
    const total = this.calls.length || 1;
    const firstPass = this.calls.filter((call) => call.firstPassValid).length;
    const repaired = this.calls.filter((call) => call.attempts > 1).length;
    const failed = this.calls.filter((call) => call.failed).length;
    const refused = this.calls.filter((call) => call.finalOutcome === 'refused').length;
    const truncated = this.calls.filter((call) => call.finalOutcome === 'truncated').length;
    const flagged = this.calls.filter((call) => call.flagged).length;

    const latencies = this.calls.map((call) => call.totalLatencyMs).sort((a, b) => a - b);

    // Chapter 09 §09.2 — the single most useful chart: "the model is unreliable"
    // becomes "durationMinutes is a string 4% of the time", which is a ticket.
    const distribution = new Map<string, number>();
    for (const trace of this.traces) {
      for (const candidate of trace.issues) {
        const key = `${candidate.path} :: ${candidate.type}`;
        distribution.set(key, (distribution.get(key) ?? 0) + 1);
      }
    }

    const byEnforcement: Record<string, { calls: number; firstPassValid: number; validityRate: number }> = {};
    for (const call of this.calls) {
      const bucket = (byEnforcement[call.enforcement] ??= { calls: 0, firstPassValid: 0, validityRate: 0 });
      bucket.calls += 1;
      if (call.firstPassValid) bucket.firstPassValid += 1;
    }
    for (const bucket of Object.values(byEnforcement)) {
      bucket.validityRate = bucket.calls === 0 ? 0 : Number((bucket.firstPassValid / bucket.calls).toFixed(4));
    }

    const byOutcome: Record<string, number> = {};
    for (const call of this.calls) byOutcome[call.finalOutcome] = (byOutcome[call.finalOutcome] ?? 0) + 1;

    const inputTokens = this.traces.reduce((sum, trace) => sum + trace.inputTokens, 0);
    const outputTokens = this.traces.reduce((sum, trace) => sum + trace.outputTokens, 0);
    const cacheTotal = this.cacheHits + this.cacheMisses;

    return {
      calls: this.calls.length,
      attempts: this.traces.length,
      firstPassValidityRate: Number((firstPass / total).toFixed(4)),
      repairRate: Number((repaired / total).toFixed(4)),
      finalFailureRate: Number((failed / total).toFixed(4)),
      refusalRate: Number((refused / total).toFixed(4)),
      truncationRate: Number((truncated / total).toFixed(4)),
      semanticFlagRate: Number((flagged / total).toFixed(4)),
      cacheHitRate: cacheTotal === 0 ? 0 : Number((this.cacheHits / cacheTotal).toFixed(4)),
      p50LatencyMs: percentile(latencies, 0.5),
      p95LatencyMs: percentile(latencies, 0.95),
      p99LatencyMs: percentile(latencies, 0.99),
      issueDistribution: [...distribution.entries()]
        .map(([key, count]) => {
          const [path = '', type = ''] = key.split(' :: ');
          return { path, type, count };
        })
        .sort((a, b) => b.count - a.count),
      byEnforcement,
      byOutcome,
      cost: {
        inputTokens,
        outputTokens,
        // Chapter 09 §09.5 — the (1 + repairRate) factor, measured not assumed.
        repairMultiplier: this.calls.length === 0 ? 1 : Number((this.traces.length / this.calls.length).toFixed(2)),
        schemaTokenCost,
        estimatedCallsAvoided: this.cacheHits,
      },
    };
  }

  public reset(): void {
    this.traces.length = 0;
    this.calls.length = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.debug.clear();
  }

  /**
   * Chapter 09 §09.2.1 — A PROMETHEUS EXPOSITION.
   *
   * The dashboard layout the notes recommend, rendered as scrapeable text so it
   * drops into an existing monitoring stack without a bespoke exporter. Every
   * series carries the two dimensions that make a regression attributable: the
   * model and the schema version.
   */
  public renderPrometheus(schemaTokenCost: number, labels: string): string {
    const snapshot = this.snapshot(schemaTokenCost);
    const lines: string[] = [
      '# HELP structured_output_calls_total Structured-output calls handled.',
      '# TYPE structured_output_calls_total counter',
      `structured_output_calls_total{${labels}} ${snapshot.calls}`,
      '# HELP structured_output_attempts_total Provider attempts, including repairs.',
      '# TYPE structured_output_attempts_total counter',
      `structured_output_attempts_total{${labels}} ${snapshot.attempts}`,
      '# HELP structured_output_first_pass_validity_rate Fraction valid on the first attempt.',
      '# TYPE structured_output_first_pass_validity_rate gauge',
      `structured_output_first_pass_validity_rate{${labels}} ${snapshot.firstPassValidityRate}`,
      '# HELP structured_output_repair_rate Fraction of calls that needed a repair.',
      '# TYPE structured_output_repair_rate gauge',
      `structured_output_repair_rate{${labels}} ${snapshot.repairRate}`,
      '# HELP structured_output_final_failure_rate Fraction unusable after all attempts.',
      '# TYPE structured_output_final_failure_rate gauge',
      `structured_output_final_failure_rate{${labels}} ${snapshot.finalFailureRate}`,
      '# HELP structured_output_latency_ms End-to-end latency percentiles.',
      '# TYPE structured_output_latency_ms gauge',
      `structured_output_latency_ms{${labels},quantile="0.5"} ${snapshot.p50LatencyMs}`,
      `structured_output_latency_ms{${labels},quantile="0.95"} ${snapshot.p95LatencyMs}`,
      `structured_output_latency_ms{${labels},quantile="0.99"} ${snapshot.p99LatencyMs}`,
      '# HELP structured_output_issue_total Validation issues by field path and type.',
      '# TYPE structured_output_issue_total counter',
    ];

    for (const entry of snapshot.issueDistribution) {
      lines.push(`structured_output_issue_total{${labels},path="${entry.path}",type="${entry.type}"} ${entry.count}`);
    }

    for (const [rung, bucket] of Object.entries(snapshot.byEnforcement)) {
      lines.push(
        `structured_output_enforcement_validity_rate{${labels},enforcement="${rung}"} ${bucket.validityRate}`,
        `structured_output_enforcement_calls_total{${labels},enforcement="${rung}"} ${bucket.calls}`,
      );
    }

    lines.push(
      '# HELP structured_output_cost_tokens Estimated tokens, including repairs.',
      '# TYPE structured_output_cost_tokens counter',
      `structured_output_cost_tokens{${labels},direction="input"} ${snapshot.cost.inputTokens}`,
      `structured_output_cost_tokens{${labels},direction="output"} ${snapshot.cost.outputTokens}`,
      `structured_output_schema_token_cost{${labels}} ${snapshot.cost.schemaTokenCost}`,
      `structured_output_repair_multiplier{${labels}} ${snapshot.cost.repairMultiplier}`,
    );

    return `${lines.join('\n')}\n`;
  }
}

/** Chapter 09 §09.2 — the factory the composition root injects. */
export const createMetricsService = (bufferSize?: number): MetricsService =>
  new MetricsService(bufferSize ?? OBSERVABILITY.traceBufferSize);


