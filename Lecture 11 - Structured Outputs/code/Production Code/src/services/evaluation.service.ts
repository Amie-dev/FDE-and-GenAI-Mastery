import { readFile } from 'node:fs/promises';
import type { Meeting } from '../domain/meeting.schema.js';
import type { Outcome } from '../domain/outcome.js';
import type { ExtractionService } from './extraction.service.js';
import { isGoldenSet, tagCoverage, type GoldenCase, type GoldenSet, type GoldenTag } from './golden-set.types.js';

/**
 * Chapter 09 §09.4 — THE EVALUATION HARNESS.
 *
 * The non-negotiable property is the first one in the notes' list: it must replay
 * the SAME code path as production. A harness with a simplified prompt measures a
 * system you do not ship.
 *
 * So this file calls `ExtractionService.extract()` — the identical entry point the
 * HTTP layer calls — and scores per FIELD, because object-level accuracy hides
 * which field is broken (chapter 09 §09.3).
 */

export interface FieldScore {
  readonly path: string;
  readonly expected: string;
  readonly actual: string;
  readonly passed: boolean;
}

export interface CaseResult {
  readonly id: string;
  readonly tags: readonly GoldenTag[];
  readonly outcome: Outcome<Meeting>['kind'];
  readonly attempts: number;
  readonly valid: boolean;
  readonly fieldScores: readonly FieldScore[];
  readonly fieldAccuracy: number;
  readonly latencyMs: number;
  readonly failures: readonly string[];
}

export interface EvaluationReport {
  readonly goldenSetVersion: string;
  readonly enforcement: string;
  readonly cases: number;
  readonly firstPassValidityRate: number;
  readonly finalFailureRate: number;
  readonly repairRate: number;
  readonly refusalAccuracy: number;
  readonly fieldAccuracy: number;
  readonly perFieldAccuracy: Readonly<Record<string, number>>;
  readonly tagCoverage: Readonly<Record<GoldenTag, number>>;
  readonly p95LatencyMs: number;
  readonly results: readonly CaseResult[];
  readonly regressions: readonly string[];
}

const stringify = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value ?? null));

/**
 * Chapter 09 §09.3 — FIELD-LEVEL SCORING.
 *
 * Three assertions per case, and the last two are the ones people forget:
 *   - declared fields match;
 *   - `mustBeNull` fields really are null (so invention is a failure);
 *   - `mustRefuse` cases really refused (so over-compliance is a failure).
 */
export const scoreCase = (
  goldenCase: GoldenCase,
  outcome: Outcome<Meeting>,
): { scores: FieldScore[]; failures: string[] } => {
  const scores: FieldScore[] = [];
  const failures: string[] = [];
  const expectation = goldenCase.expected;

  if (expectation.mustRefuse) {
    const refused = outcome.kind === 'refused';
    scores.push({ path: '(refusal)', expected: 'refused', actual: outcome.kind, passed: refused });
    if (!refused) failures.push(`expected a refusal, got ${outcome.kind}`);
    return { scores, failures };
  }

  if (outcome.kind !== 'ok' && outcome.kind !== 'repaired' && outcome.kind !== 'degraded') {
    scores.push({ path: '(outcome)', expected: 'usable object', actual: outcome.kind, passed: false });
    failures.push(`expected a usable object, got ${outcome.kind}`);
    return { scores, failures };
  }

  const value = outcome.value as unknown as Record<string, unknown>;

  for (const [path, expected] of Object.entries(expectation.fields ?? {})) {
    const actual = value[path];
    const passed = stringify(actual) === stringify(expected);
    scores.push({ path, expected: stringify(expected), actual: stringify(actual), passed });
    if (!passed) failures.push(`${path}: expected ${stringify(expected)}, got ${stringify(actual)}`);
  }

  for (const path of expectation.mustBeNull ?? []) {
    const actual = value[path as string];
    const passed = actual === null;
    scores.push({ path: `${path as string} (must be null)`, expected: 'null', actual: stringify(actual), passed });
    if (!passed) failures.push(`${path as string}: expected null (no invention), got ${stringify(actual)}`);
  }

  if (expectation.expectKind && outcome.kind !== expectation.expectKind) {
    failures.push(`expected outcome ${expectation.expectKind}, got ${outcome.kind}`);
  }

  return { scores, failures };
};

const percentile = (sorted: readonly number[], fraction: number): number => {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index] ?? 0;
};

export class EvaluationService {
  constructor(private readonly extraction: ExtractionService) {}

  /** Chapter 09 §09.4 — the set is read from disk so it is versioned with the code. */
  public async loadGoldenSet(path: string): Promise<GoldenSet> {
    const raw = await readFile(path, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isGoldenSet(parsed)) throw new Error(`not a valid golden set: ${path}`);
    return parsed;
  }

  /**
   * Chapter 09 §09.4 — replay every case through the production path.
   *
   * `now` is pinned so the relative-date cases are reproducible, and each case
   * runs under its OWN tenant id, because a cache hit would make the validity
   * numbers meaningless.
   */
  public async run(
    set: GoldenSet,
    options: { now?: Date; directory?: ReadonlySet<string> } = {},
  ): Promise<EvaluationReport> {
    const now = options.now ?? new Date();
    const results: CaseResult[] = [];

    for (const goldenCase of set.cases) {
      const outcome = await this.extraction.extract({
        text: goldenCase.input,
        tenantId: goldenCase.tenantId ?? `golden:${goldenCase.id}`,
        now,
        ...(options.directory ? { directory: options.directory } : {}),
      });

      const { scores, failures } = scoreCase(goldenCase, outcome);
      const passed = scores.filter((score) => score.passed).length;

      results.push({
        id: goldenCase.id,
        tags: goldenCase.tags,
        outcome: outcome.kind,
        attempts: outcome.attempts,
        valid: outcome.kind === 'ok' || outcome.kind === 'repaired',
        fieldScores: scores,
        fieldAccuracy: scores.length === 0 ? 1 : Number((passed / scores.length).toFixed(4)),
        latencyMs: outcome.latencyMs,
        failures,
      });
    }

    const total = results.length || 1;
    const firstPass = results.filter((result) => result.outcome === 'ok' && result.attempts === 1).length;
    const failed = results.filter((result) => result.outcome === 'degraded' || result.outcome === 'invalid').length;
    const repaired = results.filter((result) => result.attempts > 1).length;

    const refusalCases = results.filter((result) => result.fieldScores.some((score) => score.path === '(refusal)'));
    const refusalsCorrect = refusalCases.filter((result) =>
      result.fieldScores.every((score) => score.passed),
    ).length;

    const perField = new Map<string, { passed: number; total: number }>();
    for (const result of results) {
      for (const score of result.fieldScores) {
        const bucket = perField.get(score.path) ?? { passed: 0, total: 0 };
        bucket.total += 1;
        if (score.passed) bucket.passed += 1;
        perField.set(score.path, bucket);
      }
    }

    const allScores = results.flatMap((result) => result.fieldScores);
    const latencies = results.map((result) => result.latencyMs).sort((a, b) => a - b);
    const passedScores = allScores.filter((score) => score.passed).length;

    return {
      goldenSetVersion: set.version,
      enforcement: this.extraction.decision().rung,
      cases: results.length,
      firstPassValidityRate: Number((firstPass / total).toFixed(4)),
      finalFailureRate: Number((failed / total).toFixed(4)),
      repairRate: Number((repaired / total).toFixed(4)),
      refusalAccuracy: refusalCases.length === 0 ? 1 : Number((refusalsCorrect / refusalCases.length).toFixed(4)),
      fieldAccuracy: allScores.length === 0 ? 1 : Number((passedScores / allScores.length).toFixed(4)),
      perFieldAccuracy: Object.fromEntries(
        [...perField.entries()].map(([path, bucket]) => [path, Number((bucket.passed / bucket.total).toFixed(4))]),
      ),
      tagCoverage: tagCoverage(set),
      p95LatencyMs: percentile(latencies, 0.95),
      results,
      regressions: results
        .filter((result) => result.failures.length > 0)
        .map((result) => `${result.id}: ${result.failures.join('; ')}`),
    };
  }
}

/**
 * Chapter 09 §09.4 — THE RELEASE GATE.
 *
 * A threshold set that turns the report into a pass/fail, so CI can block a merge
 * that trades quality for a cheaper model or a "simpler" schema.
 */
export const evaluateGate = (
  report: EvaluationReport,
  thresholds: {
    firstPassValidityRate: number;
    fieldAccuracy: number;
    finalFailureRate: number;
    refusalAccuracy: number;
  },
): { passed: boolean; breaches: string[] } => {
  const breaches: string[] = [];
  if (report.firstPassValidityRate < thresholds.firstPassValidityRate)
    breaches.push(`firstPassValidityRate ${report.firstPassValidityRate} < ${thresholds.firstPassValidityRate}`);
  if (report.fieldAccuracy < thresholds.fieldAccuracy)
    breaches.push(`fieldAccuracy ${report.fieldAccuracy} < ${thresholds.fieldAccuracy}`);
  if (report.finalFailureRate > thresholds.finalFailureRate)
    breaches.push(`finalFailureRate ${report.finalFailureRate} > ${thresholds.finalFailureRate}`);
  if (report.refusalAccuracy < thresholds.refusalAccuracy)
    breaches.push(`refusalAccuracy ${report.refusalAccuracy} < ${thresholds.refusalAccuracy}`);
  return { passed: breaches.length === 0, breaches };
};

/** Chapter 09 §09.4 — the default gate for this task, kept next to the harness. */
export const DEFAULT_GATE = Object.freeze({
  firstPassValidityRate: 0.5,
  fieldAccuracy: 0.85,
  finalFailureRate: 0.05,
  refusalAccuracy: 1,
});

