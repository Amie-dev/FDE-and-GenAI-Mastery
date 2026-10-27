import { REMEMBERED_TRACES, SEMANTIC_POLICY, config } from '../config/config.js';
import { SYSTEM_PROMPT, chooseEnforcement, estimate, callModel, isOffline } from '../lib/llm.js';
import { MeetingSchema, MEETING_JSON_SCHEMA, SCHEMA_VERSION, type Meeting } from '../schema/meeting.schema.js';
import type { Issue, MetricsSnapshot, Outcome, StructuredTrace } from '../types/extraction.types.js';

/**
 * Chapter 06 — THE DETECTION AND RECOVERY HALF.
 *
 * One rule from which everything here follows:
 *
 *   > No unvalidated model output may cross into application logic.
 *
 * The three corollaries are visible in this file:
 *   1. the validator is not optional — it runs on EVERY path, even the happy one;
 *   2. the boundary is a SINGLE place — `extract()` is the only entry point;
 *   3. failure is a DESIGNED path — every outcome is a typed value.
 */

/** Chapter 09 §09.2 — the traces and per-call summaries the metrics are computed from. */
const traces: StructuredTrace[] = [];

interface CallSummary {
  traceId: string;
  attempts: number;
  finalOutcome: StructuredTrace['outcome'];
  enforcement: StructuredTrace['enforcement'];
  totalLatencyMs: number;
  flagged: boolean;
}

const calls: CallSummary[] = [];

const push = <T>(list: T[], item: T, limit: number): void => {
  list.push(item);
  if (list.length > limit) list.shift();
};

/**
 * Chapter 06 §06.5.2 — the validator's contract, made explicit.
 *
 * Deterministic · total (never throws) · cheap · explainable · side-effect free.
 * Note what it does NOT do: it never "cleans up" data. Coercing "30" into 30
 * would convert a detectable failure into a silent mutation — the exact class of
 * bug this lecture exists to remove.
 */
export const toIssues = (error: { issues: { path: (string | number)[]; message: string; code: string }[] }): Issue[] =>
  error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: `${issue.message} [${issue.code}]`,
    severity: 'block' as const,
  }));

/**
 * Chapter 06 §06.2 step 2 and 3a — parse, then validate the SHAPE.
 *
 * Returns a discriminated result rather than throwing, because errors are data:
 * they will be logged, counted and turned into a repair prompt.
 */
export const parseCandidate = (
  raw: string,
): { kind: 'ok'; value: Meeting } | { kind: 'parse_error' | 'shape_error'; issues: Issue[] } => {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    return {
      kind: 'parse_error',
      issues: [{ path: '(root)', message: `Not parseable JSON: ${String(error)}`, severity: 'block' }],
    };
  }

  const result = MeetingSchema.safeParse(json);
  if (!result.success) return { kind: 'shape_error', issues: toIssues(result.error) };

  return { kind: 'ok', value: result.data };
};

/**
 * Chapter 06 §06.6 — the SEMANTIC layer, which is where the value lives.
 *
 * Structural validation is the same in every project. Semantic validation needs
 * the world: a clock, another system, another field. Three reasons the schema
 * cannot do this (chapter 06 §06.4.1):
 *   - the schema has no clock      -> "must be in the future"
 *   - the schema has no other system -> "the attendee must exist"
 *   - the schema has no cross-field logic -> "INTERVIEW implies >= 30 minutes"
 */
export const semanticChecks = (meeting: Meeting, ctx: { now: Date }): Issue[] => {
  const issues: Issue[] = [];
  const start = new Date(meeting.startIso);
  const horizonMs = SEMANTIC_POLICY.maxDurationDays * 24 * 60 * 60 * 1000;

  // Temporal: a start time in the past is unusable — `block`.
  if (start.getTime() <= ctx.now.getTime()) {
    issues.push({ path: 'startIso', message: 'Meeting start is not in the future', severity: 'block' });
  }

  // Temporal: absurdly far in the future usually means a mis-parsed year — `review`.
  if (start.getTime() - ctx.now.getTime() > horizonMs) {
    issues.push({
      path: 'startIso',
      message: `Start is more than ${SEMANTIC_POLICY.maxDurationDays} days away`,
      severity: 'review',
    });
  }

  // Numeric plausibility: long but legal durations need a human — `review`.
  if (meeting.durationMinutes > SEMANTIC_POLICY.reviewDurationMinutes) {
    issues.push({
      path: 'durationMinutes',
      message: `Duration exceeds the ${SEMANTIC_POLICY.reviewDurationMinutes}-minute policy`,
      severity: 'review',
    });
  }

  // Cross-field consistency — `block`.
  if (meeting.type === 'INTERVIEW' && meeting.durationMinutes < 30) {
    issues.push({ path: 'durationMinutes', message: 'Interviews must be at least 30 minutes', severity: 'block' });
  }

  // §04.14.1 — the abstention flag must be honest. Claiming confidence with a
  // null email is exactly the over-confident object this lecture warns about.
  if (meeting.attendeeEmail === null && meeting.needsHuman === false) {
    issues.push({
      path: 'needsHuman',
      message: 'needsHuman must be true when a field is null',
      severity: 'block',
    });
  }

  return issues;
};

/**
 * Chapter 06 §06.8 — THE REPAIR PROMPT.
 *
 * Four ingredients, and each one matters:
 *   1. the machine-readable issues (path + expected vs received);
 *   2. the previous output, so the model EDITS rather than regenerates;
 *   3. a scoping instruction ("fix only these fields");
 *   4. a format instruction ("return the object only").
 *
 * Anti-pattern it avoids: restating the original input in full. It is already in
 * the conversation; repeating it dilutes attention and doubles the cost.
 */
export const buildRepairPrompt = (args: { previous: string; issues: Issue[] }): string =>
  [
    'Your previous output failed validation against the required schema.',
    '',
    'Validation errors:',
    ...args.issues.map((issue) => `- ${issue.path}: ${issue.message}`),
    '',
    'Previous output:',
    args.previous,
    '',
    'Fix ONLY the fields listed above. Do not add, remove or rename any fields.',
    'Return the corrected object only.',
  ].join('\n');

/**
 * Chapter 06 §06.9.1 — THE DEGRADED OBJECT.
 *
 * The most under-used rung of the fallback ladder, and often the best one. The
 * SHAPE stays valid (so downstream code needs no special case), every unknown is
 * an explicit `null` rather than a guess, and the degradation is LOUD: it is in
 * the object, not only in a log.
 */
export const degradedMeeting = (reason: string): Meeting => ({
  schemaVersion: SCHEMA_VERSION,
  reasoning: `Degraded: ${reason}`,
  title: 'Untitled meeting',
  attendeeName: 'Unknown',
  attendeeEmail: null,
  startIso: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  durationMinutes: 30,
  type: 'OTHER',
  location: null,
  needsHuman: true,
});

/** Chapter 09 §09.6 — one trace per ATTEMPT. Paths and types, never values. */
const record = (args: {
  traceId: string;
  attempt: number;
  enforcement: StructuredTrace['enforcement'];
  outcome: StructuredTrace['outcome'];
  issues: Issue[];
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  semanticFlags: string[];
}): void => {
  push(
    traces,
    {
      traceId: args.traceId,
      task: 'meeting_extraction',
      schemaVersion: SCHEMA_VERSION,
      model: isOffline() ? 'offline-stub' : config.AI_MODEL,
      attempt: args.attempt,
      enforcement: args.enforcement,
      outcome: args.outcome,
      issues: args.issues.map((issue) => ({
        path: issue.path,
        type: issue.message.match(/\[(\w+)\]/)?.[1] ?? 'semantic',
      })),
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      latencyMs: args.latencyMs,
      semanticFlags: args.semanticFlags,
    },
    REMEMBERED_TRACES,
  );
};

const remember = (summary: CallSummary): void => push(calls, summary, REMEMBERED_TRACES);

/**
 * Chapter 06 §06.2 — THE RELIABILITY LOOP.
 *
 * The loop has exactly ONE non-terminating risk — the repair cycle — and it is
 * bounded by `MAX_REPAIRS`. Everything else is a straight line. When the bound is
 * reached we do not throw: we walk down the fallback ladder to the degraded
 * object (chapter 06 §06.9).
 */
export const extract = async (text: string): Promise<Outcome<Meeting>> => {
  const traceId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const enforcement = chooseEnforcement();
  const startedAt = Date.now();

  const collected: Issue[] = [];
  const collectedFlags: string[] = [];
  /** Chapter 06 §06.8 — the repair block is a FOLLOW-UP turn; the original text stays put. */
  let repair: string | undefined;
  let attempts = 0;
  let finalOutcome: StructuredTrace['outcome'] = 'invalid';
  let result: Outcome<Meeting> | null = null;

  /** Chapter 09 §09.6 — one trace per attempt. */
  const finish = (
    attempt: number,
    outcome: StructuredTrace['outcome'],
    issues: Issue[],
    flags: string[],
    usage: { inputTokens: number; outputTokens: number; latencyMs: number },
  ): void => {
    record({
      traceId,
      attempt,
      enforcement,
      outcome,
      issues,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs: usage.latencyMs,
      semanticFlags: flags,
    });
  };

  for (let attempt = 1; attempt <= config.MAX_REPAIRS + 1; attempt++) {
    attempts = attempt;
    const attemptStart = Date.now();
    const raw = await callModel({ system: SYSTEM_PROMPT, user: text, repair, enforcement });
    const usage = { inputTokens: raw.inputTokens, outputTokens: raw.outputTokens, latencyMs: Date.now() - attemptStart };

    // Chapter 06 §06.10 — refusals and truncation are terminal outcomes, never
    // exceptions, and never blind-retried.
    if (raw.refused) {
      finish(attempt, 'refused', [], [], usage);
      finalOutcome = 'refused';
      result = { kind: 'refused', reason: raw.text.slice(0, 200), attempts };
      break;
    }

    if (raw.truncated) {
      const issues: Issue[] = [{ path: '(root)', message: 'Output hit the token budget [truncated]', severity: 'block' }];
      finish(attempt, 'truncated', issues, [], usage);
      collected.push(...issues);
      finalOutcome = 'truncated';
      result = { kind: 'truncated', raw: raw.text, attempts };
      break;
    }

    // Chapter 06 §06.2 steps 2 and 3a — parse, then validate the SHAPE.
    const parsed = parseCandidate(raw.text);
    if (parsed.kind !== 'ok') {
      collected.push(...parsed.issues);
      finish(attempt, 'invalid', parsed.issues, [], usage);
      repair = buildRepairPrompt({ previous: raw.text, issues: parsed.issues });
      continue; // -> the repair cycle, bounded by MAX_REPAIRS
    }

    // Chapter 06 §06.2 step 3b — validate the MEANING.
    const semantic = semanticChecks(parsed.value, { now: new Date() });
    const blocking = semantic.filter((issue) => issue.severity === 'block');
    const flags = semantic.filter((issue) => issue.severity === 'review').map((issue) => `${issue.path}: ${issue.message}`);
    collectedFlags.push(...flags);

    if (blocking.length > 0) {
      collected.push(...blocking);
      finish(attempt, 'invalid', blocking, flags, usage);
      repair = buildRepairPrompt({ previous: raw.text, issues: blocking });
      continue;
    }

    // §06.2 step 5 — accept. A `review` object is accepted AND flagged, which is
    // exactly what prevents over-rejecting good data.
    const clean = attempt === 1 && collected.length === 0;

    if (clean) {
      finish(attempt, 'ok', [], flags, usage);
      finalOutcome = 'ok';
      result = { kind: 'ok', value: parsed.value, attempts, enforcement };
      break;
    }

    finish(attempt, 'repaired', collected, flags, usage);
    finalOutcome = 'repaired';
    result = { kind: 'repaired', value: parsed.value, attempts, issues: collected, enforcement };
    break;
  }

  // Chapter 06 §06.9 — repair exhausted, so walk down the ladder rather than throw.
  if (!result) {
    const reason = collected.map((issue) => `${issue.path}: ${issue.message}`).join('; ') || 'no usable object';
    finish(attempts, 'degraded', collected, ['degraded'], {
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startedAt,
    });
    finalOutcome = 'degraded';
    result = { kind: 'degraded', value: degradedMeeting(reason), reason, attempts };
  }

  /**
   * Chapter 09 §09.2 — exactly ONE call summary per call.
   *
   * Getting this wrong is the classic metrics bug: remembering per ATTEMPT
   * inflates `calls` and quietly corrupts first-pass validity and the repair
   * rate. A call is a call; an attempt is a call plus its repairs.
   */
  remember({
    traceId,
    attempts,
    finalOutcome,
    enforcement,
    totalLatencyMs: Date.now() - startedAt,
    flagged: collectedFlags.length > 0,
  });

  return result;
};


/** Chapter 09 §09.6 — the raw traces, for inspection. */
export const recentTraces = (): StructuredTrace[] => [...traces].reverse();

/**
 * Chapter 09 §09.2 — THE METRICS THAT MATTER.
 *
 * Note the dimension every rate carries: `enforcement`. Without it you cannot
 * tell a regression from a rollout — and the gate for this lecture asks for
 * exactly this table (validity per enforcement rung).
 */
export const metrics = (): MetricsSnapshot => {
  const total = calls.length || 1;
  const firstPass = calls.filter((call) => call.attempts === 1 && call.finalOutcome === 'ok').length;
  const repaired = calls.filter((call) => call.attempts > 1).length;
  const failed = calls.filter((call) => call.finalOutcome === 'degraded' || call.finalOutcome === 'invalid').length;
  const refused = calls.filter((call) => call.finalOutcome === 'refused').length;
  const flagged = calls.filter((call) => call.flagged).length;

  const latencies = calls.map((call) => call.totalLatencyMs).sort((a, b) => a - b);
  const p95 = latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] : 0;

  // Chapter 09 §09.2 — the single most useful chart: "the model is unreliable"
  // becomes "durationMinutes is a string 4% of the time", which is a ticket.
  const distribution = new Map<string, number>();
  for (const trace of traces) {
    for (const issue of trace.issues) {
      const key = `${issue.path} :: ${issue.type}`;
      distribution.set(key, (distribution.get(key) ?? 0) + 1);
    }
  }

  const byEnforcement: MetricsSnapshot['byEnforcement'] = {};
  for (const call of calls) {
    const bucket = (byEnforcement[call.enforcement] ??= { calls: 0, firstPassValid: 0, validityRate: 0 });
    bucket.calls += 1;
    if (call.attempts === 1 && call.finalOutcome === 'ok') bucket.firstPassValid += 1;
  }
  for (const bucket of Object.values(byEnforcement)) {
    bucket.validityRate = bucket.calls ? Number((bucket.firstPassValid / bucket.calls).toFixed(4)) : 0;
  }

  return {
    calls: calls.length,
    attempts: traces.length,
    firstPassValidityRate: Number((firstPass / total).toFixed(4)),
    repairRate: Number((repaired / total).toFixed(4)),
    finalFailureRate: Number((failed / total).toFixed(4)),
    refusalRate: Number((refused / total).toFixed(4)),
    semanticFlagRate: Number((flagged / total).toFixed(4)),
    p95LatencyMs: p95,
    issueDistribution: [...distribution.entries()]
      .map(([key, count]) => {
        const [path, type] = key.split(' :: ');
        return { path, type, count };
      })
      .sort((a, b) => b.count - a.count),
    byEnforcement,
  };
};

/**
 * Chapter 09 §09.5 — the cost model, with its four drivers.
 *
 *   base call  + schema tokens (input)  + reasoning tokens (output)
 *   multiplied by  (1 + repairRate)
 */
export const costEstimate = (): {
  inputTokens: number;
  outputTokens: number;
  repairMultiplier: number;
  schemaTokenCost: number;
} => {
  const inputTokens = traces.reduce((sum, trace) => sum + trace.inputTokens, 0);
  const outputTokens = traces.reduce((sum, trace) => sum + trace.outputTokens, 0);
  const repairMultiplier = calls.length ? Number((traces.length / calls.length).toFixed(2)) : 1;
  return {
    inputTokens,
    outputTokens,
    repairMultiplier,
    schemaTokenCost: estimate(JSON.stringify(MEETING_JSON_SCHEMA)),
  };
};

/** Chapter 05 §05.10.1 — how many objects were valid but abstained or flagged. */
export const flaggedCount = (): number => traces.filter((trace) => trace.semanticFlags.length > 0).length;



