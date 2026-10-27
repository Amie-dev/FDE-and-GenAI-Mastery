import { Request, Response } from 'express';
import { ENFORCEMENT_LADDER, SEMANTIC_POLICY, config } from '../config/config.js';
import { enforcementReason, isOffline, chooseEnforcement } from '../lib/llm.js';
import {
  MEETING_JSON_SCHEMA,
  MEETING_TYPES,
  NO_UNIONS_REASON,
  SCHEMA_VERSION,
  SILENT_LIMITS,
} from '../schema/meeting.schema.js';
import {
  costEstimate,
  extract,
  flaggedCount,
  metrics,
  recentTraces,
} from '../services/extraction.service.js';
import type { ExtractBody } from '../middleware/validate.js';

/**
 * Chapter 06 §06.1.1 — the controller owns the HTTP lifecycle and NOTHING else.
 *
 * Notice how thin it is. It parses, calls the service, and maps a TYPED OUTCOME
 * to a status code. Its whole contribution to "intelligence" is one line:
 * `await extract(...)`.
 *
 * The one interesting decision is here, and it is a *product* decision: how does
 * each outcome map to an HTTP status?
 */

/** Chapter 06 §06.10 — the outcome-to-status mapping, in one readable table. */
const STATUS_FOR: Record<string, number> = {
  ok: 200,
  repaired: 200, // usable — the repair is reported in the body, not as an error
  degraded: 206, // Partial Content: a valid object with explicit unknowns
  refused: 422, // the model declined; do not retry
  truncated: 502, // the provider cut the output; raise the budget
  invalid: 502, // exhausted repairs; the object never became usable
};

export const getHealth = (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    mode: isOffline() ? 'offline (deterministic stub model)' : 'live provider',
    model: config.AI_MODEL,
    provider: config.AI_PROVIDER,
    temperature: config.AI_TEMPERATURE,
    /** Chapter 05 §05.7 — which rung of the ladder this process is on, and why. */
    enforcement: { active: chooseEnforcement(), ladder: ENFORCEMENT_LADDER, reason: enforcementReason() },
    /** Chapter 04 §04.12.12 — the contract's version, on every response. */
    schemaVersion: SCHEMA_VERSION,
    /** Chapter 05 §05.4.3 — what the decoder does NOT enforce. */
    silentLimits: SILENT_LIMITS,
    semanticPolicy: SEMANTIC_POLICY,
    loop: { maxRepairs: config.MAX_REPAIRS, maxTokens: config.MAX_TOKENS },
    endpoints: ['GET /api/health', 'GET /api/schema', 'POST /api/extract', 'GET /api/metrics'],
  });
};

/**
 * Chapter 02 §02.6 — THE THREE ARTEFACTS, made visible.
 *
 * Artefact 3 (the wire contract) is shown here. Artefact 1 (the type) and
 * artefact 2 (the validator) are not JSON — they exist at compile time and at
 * the boundary — but all three come from the same declaration.
 */
export const getSchema = (_req: Request, res: Response): void => {
  res.json({
    schemaVersion: SCHEMA_VERSION,
    artefacts: {
      1: 'TypeScript type  -> z.infer<typeof MeetingSchema> (compile time)',
      2: 'Runtime validator -> MeetingSchema.safeParse (the boundary)',
      3: 'Wire contract     -> MEETING_JSON_SCHEMA (this document)',
    },
    closedSet: MEETING_TYPES,
    /** §04.12.10 — the union rule, and why. */
    unions: { used: false, reason: NO_UNIONS_REASON },
    silentLimits: SILENT_LIMITS,
    jsonSchema: MEETING_JSON_SCHEMA,
  });
};

/**
 * Chapter 06 §06.2 — the whole reliability loop, behind one endpoint.
 *
 * Every branch of the ladder is reachable from here, which is what makes the
 * system testable rather than hoped-for.
 */
export const postExtract = async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body as ExtractBody;
  const outcome = await extract(text);

  const status = STATUS_FOR[outcome.kind] ?? 500;

  // Chapter 09 §09.6 — the response carries the trace, so the caller can see
  // WHICH attempt produced the object and WHAT failed before it.
  res.status(status).json({
    outcome: outcome.kind,
    attempts: outcome.attempts,
    value: 'value' in outcome ? outcome.value : undefined,
    reason: 'reason' in outcome ? outcome.reason : undefined,
    issues: 'issues' in outcome ? outcome.issues : undefined,
    enforcement: 'enforcement' in outcome ? outcome.enforcement : undefined,
    trace: recentTraces()[0],
  });
};

/** Chapter 09 §09.2 — the metrics table the lecture's gate asks for. */
export const getMetrics = (_req: Request, res: Response): void => {
  res.json({
    metrics: metrics(),
    cost: costEstimate(),
    flaggedTraces: flaggedCount(),
    note: 'Every rate is dimensioned by enforcement, because without it you cannot tell a regression from a rollout.',
  });
};
