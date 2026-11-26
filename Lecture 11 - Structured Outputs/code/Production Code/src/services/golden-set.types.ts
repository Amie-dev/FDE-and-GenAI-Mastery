import type { Meeting } from '../domain/meeting.schema.js';
import type { Outcome } from '../domain/outcome.js';

/**
 * Chapter 09 §09.3 — THE GOLDEN SET.
 *
 * The evaluation set for structured output is NOT a RAG evaluation set. It needs
 * inputs with KNOWN CORRECT OBJECTS, including adversarial ones, and it must be
 * able to assert absence and refusal as first-class expectations — that is how a
 * model that invents values gets caught.
 */

export type GoldenTag = 'clean' | 'ambiguous' | 'adversarial' | 'edge' | 'regression';

/** Chapter 09 §09.3 — the per-case expectations. */
export interface GoldenExpectation {
  /** Field-level expectations: any subset of the object. */
  readonly fields?: Partial<Record<keyof Meeting, unknown>>;
  /** Chapter 09 §09.3 — "this field must be null", so invention is a failure. */
  readonly mustBeNull?: ReadonlyArray<keyof Meeting>;
  /** Chapter 09 §09.3 — "the model must decline", so over-compliance is a failure. */
  readonly mustRefuse?: boolean;
  /** Chapter 09 §09.3 — the expected terminal outcome, when it is not `ok`. */
  readonly expectKind?: Outcome<Meeting>['kind'];
}

export interface GoldenCase {
  readonly id: string;
  readonly input: string;
  readonly expected: GoldenExpectation;
  readonly tags: readonly GoldenTag[];
  readonly notes?: string;
  /** The tenant the case runs as, so caching and isolation can be exercised. */
  readonly tenantId?: string;
}

export interface GoldenSet {
  readonly version: string;
  readonly schemaVersion: string;
  readonly description: string;
  readonly cases: readonly GoldenCase[];
}

export const isGoldenSet = (value: unknown): value is GoldenSet => {
  const candidate = value as Partial<GoldenSet>;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof candidate.version === 'string' &&
    Array.isArray(candidate.cases)
  );
};

/** Chapter 09 §09.3.1 — the five categories, counted, so coverage is visible. */
export const tagCoverage = (set: GoldenSet): Record<GoldenTag, number> => {
  const counts: Record<GoldenTag, number> = { clean: 0, ambiguous: 0, adversarial: 0, edge: 0, regression: 0 };
  for (const goldenCase of set.cases) for (const tag of goldenCase.tags) counts[tag] += 1;
  return counts;
};
