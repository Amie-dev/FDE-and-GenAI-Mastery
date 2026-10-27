import { RELIABILITY } from '../config/env.js';
import type { Issue } from '../domain/issues.js';
import { renderIssue } from '../domain/issues.js';
import { truncateForPrompt } from '../lib/json.js';

/**
 * Chapter 06 §06.8 — THE REPAIR PROMPT.
 *
 * Four ingredients, each of which changes the outcome:
 *   1. the machine-readable issues (path + reason), not "try again";
 *   2. the previous output verbatim, so the model EDITS rather than regenerates;
 *   3. a scoping instruction, so a correct field is not rewritten;
 *   4. a format instruction, so the reply is only the object.
 *
 * The anti-pattern this avoids is restating the original input: it is already in
 * the conversation (see `providers/openai.provider.ts`), and duplicating it both
 * dilutes attention and doubles the input cost.
 */

export interface RepairPromptInput {
  readonly previous: string;
  readonly issues: readonly Issue[];
  /** Chapter 06 §06.8.1 — the schema is NOT repeated; it is in the system prompt. */
  readonly attempt: number;
}

export const buildRepairPrompt = ({ previous, issues, attempt }: RepairPromptInput): string => {
  const lines = [
    'Your previous output failed validation against the required schema.',
    '',
    'Validation errors:',
    ...issues.map(renderIssue),
    '',
    'Previous output:',
    truncateForPrompt(previous),
    '',
    'Fix ONLY the fields listed above. Do not add, remove or rename any fields.',
    'Preserve every field that was already valid, including startIso.',
    'Return the corrected object only.',
  ];

  // Chapter 06 §06.7.1 — on a second repair, say so: the model must not simply
  // repeat the previous attempt.
  if (attempt > 2) {
    lines.splice(1, 0, `This is repair attempt ${attempt - 1}; the same errors have recurred.`);
  }

  return lines.join('\n');
};

/**
 * Chapter 06 §06.9.1 — THE DEGRADED OBJECT.
 *
 * The last rung of the ladder, and the reason the ladder is usable: the SHAPE
 * stays valid, so no downstream consumer needs a special case; every unknown is
 * an explicit `null` rather than a guess; and the degradation is LOUD — it is in
 * the object (`reasoning`, `needsHuman`), not only in a log line.
 */
export interface DegradedMeeting {
  readonly schemaVersion: string;
  readonly reasoning: string;
  readonly title: string;
  readonly attendeeName: string;
  readonly attendeeEmail: null;
  readonly startIso: string;
  readonly durationMinutes: number;
  readonly type: 'OTHER';
  readonly timeZone: string;
  readonly location: null;
  readonly needsHuman: true;
}

export const buildDegradedMeeting = (
  reason: string,
  options: { now?: Date; schemaVersion: string; timeZone?: string },
): DegradedMeeting => {
  const now = options.now ?? new Date();
  return {
    schemaVersion: options.schemaVersion,
    reasoning: `Degraded: ${reason}`.slice(0, 280),
    title: 'Untitled meeting',
    attendeeName: 'Unknown',
    attendeeEmail: null,
    // A syntactically valid instant, one hour out, so the object still VALIDATES.
    // It is obviously wrong, which is the point (chapter 06 §06.9.1).
    startIso: new Date(now.getTime() + 3_600_000).toISOString(),
    durationMinutes: 30,
    type: 'OTHER',
    timeZone: options.timeZone ?? 'UTC',
    location: null,
    needsHuman: true,
  };
};

/** Chapter 06 §06.7.1 — the bound, exposed so the API can report it. */
export const repairBudget = (): number => RELIABILITY.maxRepairs;
