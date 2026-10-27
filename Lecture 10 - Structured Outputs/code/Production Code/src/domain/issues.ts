/**
 * Chapter 06 §06.5 — THE ISSUE VOCABULARY.
 *
 * A validation failure is DATA. It is logged, counted, aggregated into an issue
 * distribution, and turned into a repair prompt (chapter 06 §06.8). An exception
 * can do none of those things, which is why nothing in this codebase throws a
 * validation error.
 */

/** Chapter 06 §06.6.1 — two severities, and they are not the same thing. */
export type Severity = 'block' | 'review';

/**
 * The stable, machine-readable failure type.
 *
 * Chapter 09 §09.2 groups the issue distribution by this value, so it must be a
 * closed set — a free-text message would fragment the chart into uselessness.
 */
export type IssueType =
  | 'parse_error'
  | 'invalid_type'
  | 'invalid_enum_value'
  | 'too_small'
  | 'too_big'
  | 'unrecognized_keys'
  | 'invalid_string'
  | 'invalid_literal'
  | 'custom'
  | 'truncated'
  | 'refused'
  | 'timeout'
  | 'provider_error';

export interface Issue {
  /** A field path (`durationMinutes`) or `(root)` for whole-document failures. */
  readonly path: string;
  /** Human-readable, safe to show in a repair prompt. */
  readonly message: string;
  /** Machine-readable, used for grouping and metrics. */
  readonly type: IssueType;
  /** `block` stops the pipeline; `review` accepts and flags (chapter 06 §06.6.1). */
  readonly severity: Severity;
}

export const issue = (
  path: string,
  message: string,
  type: IssueType,
  severity: Severity = 'block',
): Issue => ({ path, message, type, severity });

/** Chapter 06 §06.6.1 — the helpers that make a rule's severity self-documenting. */
export const blocking = (path: string, message: string, type: IssueType = 'custom'): Issue =>
  issue(path, message, type, 'block');

export const review = (path: string, message: string, type: IssueType = 'custom'): Issue =>
  issue(path, message, type, 'review');

export const isBlocking = (candidate: Issue): boolean => candidate.severity === 'block';

/**
 * Chapter 06 §06.5 — Zod's error codes map onto the closed set above.
 *
 * A single mapping function is what keeps the issue distribution stable even as
 * the schema evolves: new Zod codes fall back to `custom` rather than inventing
 * a new bucket per field.
 */
const CODE_TO_TYPE: Record<string, IssueType> = {
  invalid_type: 'invalid_type',
  invalid_enum_value: 'invalid_enum_value',
  too_small: 'too_small',
  too_big: 'too_big',
  unrecognized_keys: 'unrecognized_keys',
  invalid_string: 'invalid_string',
  invalid_literal: 'invalid_literal',
  custom: 'custom',
};

export interface ZodLikeIssue {
  readonly path: ReadonlyArray<string | number>;
  readonly message: string;
  readonly code: string;
}

/**
 * Chapter 06 §06.5 — every structural failure is a `block`.
 *
 * `review` is reserved for semantic rules, where a human opinion is the right
 * answer. A type error is never a matter of judgement.
 */
export const fromZodIssues = (issues: ReadonlyArray<ZodLikeIssue>): Issue[] =>
  issues.map((raw) =>
    issue(
      raw.path.length > 0 ? raw.path.join('.') : '(root)',
      raw.message,
      CODE_TO_TYPE[raw.code] ?? 'custom',
      'block',
    ),
  );

/** Chapter 06 §06.8 — the repair prompt renders issues in one predictable format. */
export const renderIssue = (candidate: Issue): string => `- ${candidate.path}: ${candidate.message}`;

/** Chapter 09 §09.2 — a short, groupable key for the issue distribution. */
export const issueKey = (candidate: Issue): string => `${candidate.path} :: ${candidate.type}`;
