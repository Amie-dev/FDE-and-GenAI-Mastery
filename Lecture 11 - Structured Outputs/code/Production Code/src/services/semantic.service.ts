import { POLICY } from '../config/env.js';
import type { Meeting } from '../domain/meeting.schema.js';
import { blocking, review, type Issue } from '../domain/issues.js';

/**
 * Chapter 06 §06.6 — THE SEMANTIC RULE REGISTRY.
 *
 * Structural validation is the same in every project. Semantic validation is
 * unique to each, and it is where a Forward Deployed Engineer earns their salary.
 *
 * The production difference from the basic lab is that rules are REGISTERED
 * rather than hard-coded in a function body, which buys three things:
 *
 *   1. each rule has an id, so its firing rate is a metric you can chart;
 *   2. each rule has a severity, so `block` and `review` are decided per rule
 *      rather than in an `if` (§06.6.1);
 *   3. the set is enumerable, so `/api/rules` can document the policy and a test
 *      can assert that every rule is exercised by the golden set.
 *
 * Three reasons the schema cannot do any of this (chapter 06 §06.4.1):
 *   - the schema has no clock        -> "must be in the future"
 *   - the schema has no other system -> "the attendee must exist"
 *   - the schema has no cross-field logic -> "INTERVIEW implies >= 30 minutes"
 */

export interface SemanticContext {
  readonly now: Date;
  /** Chapter 06 §06.6 — the referential check needs another system. */
  readonly directory: ReadonlySet<string>;
  /** Chapter 06 §06.6.2 — provenance: the source text a value must appear in. */
  readonly sourceText: string;
}

export interface SemanticRule {
  readonly id: string;
  readonly path: string;
  readonly severity: 'block' | 'review';
  readonly description: string;
  /** Returns an issue, or `null` when the object satisfies the rule. */
  readonly check: (meeting: Meeting, context: SemanticContext) => Issue | null;
}

const normalise = (value: string): string => value.toLowerCase().replace(/\s+/g, ' ').trim();

export const SEMANTIC_RULES: readonly SemanticRule[] = Object.freeze([
  {
    id: 'start_in_future',
    path: 'startIso',
    severity: 'block',
    description: 'The meeting must start in the future.',
    check: (meeting, context) =>
      new Date(meeting.startIso).getTime() <= context.now.getTime()
        ? blocking('startIso', 'Meeting start is not in the future', 'custom')
        : null,
  },
  {
    id: 'start_within_horizon',
    path: 'startIso',
    severity: 'review',
    description: `The meeting must start within ${POLICY.maxDurationDays} days.`,
    check: (meeting, context) =>
      new Date(meeting.startIso).getTime() - context.now.getTime() > POLICY.maxDurationDays * 86_400_000
        ? review('startIso', `Start is more than ${POLICY.maxDurationDays} days away`, 'custom')
        : null,
  },
  {
    id: 'duration_within_policy',
    path: 'durationMinutes',
    severity: 'review',
    description: `The duration must not exceed ${POLICY.reviewDurationMinutes} minutes.`,
    check: (meeting) =>
      meeting.durationMinutes > POLICY.reviewDurationMinutes
        ? review('durationMinutes', `Duration exceeds the ${POLICY.reviewDurationMinutes}-minute policy`, 'too_big')
        : null,
  },
  {
    id: 'interview_min_duration',
    path: 'durationMinutes',
    severity: 'block',
    description: `An interview must last at least ${POLICY.minInterviewMinutes} minutes.`,
    check: (meeting) =>
      meeting.type === 'INTERVIEW' && meeting.durationMinutes < POLICY.minInterviewMinutes
        ? blocking('durationMinutes', `Interviews must be at least ${POLICY.minInterviewMinutes} minutes`, 'too_small')
        : null,
  },
  {
    id: 'attendee_known',
    path: 'attendeeName',
    severity: 'review',
    description: 'The attendee should exist in the directory.',
    check: (meeting, context) =>
      context.directory.size > 0 && !context.directory.has(normalise(meeting.attendeeName))
        ? review('attendeeName', 'Attendee not found in the directory', 'custom')
        : null,
  },
  {
    id: 'abstention_is_honest',
    path: 'needsHuman',
    severity: 'block',
    description: 'needsHuman must be true when a nullable field is null.',
    check: (meeting) =>
      (meeting.attendeeEmail === null || meeting.location === null) && meeting.needsHuman === false
        ? blocking('needsHuman', 'needsHuman must be true when a field is null', 'custom')
        : null,
  },
  {
    id: 'title_is_provenance_safe',
    path: 'title',
    severity: 'review',
    description: 'The title must not simply echo the whole input.',
    check: (meeting, context) =>
      context.sourceText.length > 0 && normalise(meeting.title) === normalise(context.sourceText)
        ? review('title', 'Title echoes the entire input rather than summarising it', 'custom')
        : null,
  },
]);

/**
 * Chapter 06 §06.6 — run every rule, collect every issue.
 *
 * Note the two-phase shape: rules are pure functions, so this loop is
 * deterministic, testable and free of side effects (chapter 06 §06.5.2).
 */
export const runSemanticRules = (meeting: Meeting, context: SemanticContext): Issue[] => {
  const issues: Issue[] = [];
  for (const rule of SEMANTIC_RULES) {
    const issue = rule.check(meeting, context);
    if (issue) issues.push({ ...issue, path: issue.path || rule.path });
  }
  return issues;
};

/** Chapter 06 §06.6.1 — the two severities, split once so the pipeline stays readable. */
export const splitBySeverity = (issues: readonly Issue[]): { blocking: Issue[]; reviews: Issue[] } => ({
  blocking: issues.filter((candidate) => candidate.severity === 'block'),
  reviews: issues.filter((candidate) => candidate.severity === 'review'),
});

/** Chapter 06 §06.6 — the policy, as documentation the API can serve. */
export const describeRules = (): Array<Pick<SemanticRule, 'id' | 'path' | 'severity' | 'description'>> =>
  SEMANTIC_RULES.map(({ id, path, severity, description }) => ({ id, path, severity, description }));
