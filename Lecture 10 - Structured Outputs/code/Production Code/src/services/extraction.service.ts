import { randomUUID } from 'node:crypto';
import { RELIABILITY, config } from '../config/env.js';
import { fromZodIssues, isBlocking, type Issue } from '../domain/issues.js';
import { MeetingSchema, SCHEMA_VERSION, WIRE_SCHEMAS, type Meeting } from '../domain/meeting.schema.js';
import { ProviderError, type Outcome, type ProviderResponse, type Trace } from '../domain/outcome.js';
import { safeJsonParse } from '../lib/json.js';
import { logger } from '../lib/logger.js';
import { decideEnforcement, type EnforcementDecision } from '../providers/enforcement.js';
import { buildSystemPrompt } from '../providers/prompt.js';
import type { CompletionRequest, ProviderPort } from '../providers/provider.types.js';
import type { ExtractionCache } from './cache.service.js';
import type { MetricsService } from './metrics.service.js';
import { buildDegradedMeeting, buildRepairPrompt } from './repair.service.js';
import { runSemanticRules, splitBySeverity } from './semantic.service.js';

/**
 * Chapter 06 — THE PIPELINE.
 *
 * One rule, and three corollaries that are visible in the code below:
 *
 *   > No unvalidated model output may cross into application logic.
 *
 *   1. the validator runs on EVERY path, including the happy one;
 *   2. `ExtractionService.extract()` is the SINGLE boundary — nothing else in the
 *      codebase sees raw model text;
 *   3. failure is a DESIGNED path: six typed outcomes, one exit point.
 *
 * The production additions over the basic lab are: a cache with tenant scoping,
 * a decision OBJECT for enforcement (so the choice is loggable), a semantic RULE
 * REGISTRY rather than an inline function, and a call summary written at a single
 * exit so it cannot be forgotten.
 */

export interface ExtractionRequest {
  readonly text: string;
  readonly tenantId: string;
  readonly now?: Date;
  readonly directory?: ReadonlySet<string>;
  readonly timeZone?: string;
  readonly signal?: AbortSignal;
  /** Chapter 06 §06.7.1 — a caller may LOWER the repair budget, never raise it. */
  readonly maxRepairs?: number;
}

export interface ExtractionDependencies {
  readonly provider: ProviderPort;
  readonly metrics: MetricsService;
  readonly cache: ExtractionCache;
}

interface AttemptResult {
  readonly parsed: { ok: true; value: Meeting } | { ok: false; issues: Issue[] };
  readonly response: ProviderResponse;
}

export class ExtractionService {
  private readonly enforcement: EnforcementDecision;

  constructor(private readonly deps: ExtractionDependencies) {
    // Chapter 04 §04.4 — the rung is decided ONCE, at construction, and logged.
    this.enforcement = decideEnforcement(deps.provider.name, deps.provider.model);
    logger.info(
      {
        provider: deps.provider.name,
        model: deps.provider.model,
        enforcement: this.enforcement.rung,
        downgraded: this.enforcement.downgraded,
        rationale: this.enforcement.rationale,
      },
      'enforcement decided',
    );
  }

  public decision(): EnforcementDecision {
    return this.enforcement;
  }

  /** Chapter 09 §09.5 — the fixed per-call input overhead, measured once. */
  public schemaTokenCost(): number {
    return this.deps.metrics.schemaTokenCost(WIRE_SCHEMAS.openai);
  }

  /**
   * Chapter 06 §06.2 — THE RELIABILITY LOOP.
   *
   * Exactly one cycle (the repair), exactly one bound (`maxRepairs`), and exactly
   * one exit — which is what makes the call summary impossible to forget.
   */
  public async extract(request: ExtractionRequest): Promise<Outcome<Meeting>> {
    const startedAt = Date.now();
    const traceId = `tr_${randomUUID().slice(0, 12)}`;
    const now = request.now ?? new Date();
    const model = this.deps.provider.model;
    const budget = Math.min(request.maxRepairs ?? RELIABILITY.maxRepairs, RELIABILITY.maxRepairs);

    // Chapter 05 §05.8.1 — the cache key is scoped per tenant, per model and per
    // schema version, so a rollout can never serve a stale contract's object.
    const cacheKey = this.deps.cache.key({ tenantId: request.tenantId, text: request.text, model });
    const cached = this.deps.cache.get(cacheKey);
    if (cached) {
      this.deps.metrics.recordCache(true);
      const outcome: Outcome<Meeting> = { ...cached, cached: true, latencyMs: Date.now() - startedAt };
      this.deps.metrics.recordCall({
        traceId,
        tenantId: request.tenantId,
        outcome,
        totalLatencyMs: outcome.latencyMs,
        flagged: false,
        cached: true,
        enforcement: this.enforcement.rung,
      });
      return outcome;
    }
    this.deps.metrics.recordCache(false);

    const system = buildSystemPrompt({ now, ...(request.timeZone ? { timeZone: request.timeZone } : {}) });
    const collectedIssues: Issue[] = [];
    const collectedFlags: string[] = [];

    let repair: string | undefined;
    let attempts = 0;
    let flagged = false;
    let finalOutcome: Outcome<Meeting> | null = null;

    for (let attempt = 1; attempt <= budget + 1; attempt++) {
      attempts = attempt;
      const attemptStart = Date.now();
      const result = await this.attempt({ request, system, repair, traceId });
      const latencyMs = Date.now() - attemptStart;

      // Chapter 06 §06.3 — a transport failure. Retries already happened inside
      // the provider; here it becomes a typed `failed` outcome, not a throw.
      if (result === null) {
        finalOutcome = { kind: 'failed', reason: 'provider unavailable after retries', attempts, latencyMs };
        break;
      }

      const { parsed, response } = result;

      // Chapter 06 §06.10 — refusals and truncation are terminal, and they are
      // checked BEFORE parsing so the issue distribution carries the right type.
      if (response.refused) {
        this.trace({ traceId, request, attempt, outcome: 'refused', issues: [], flags: [], response, latencyMs, cached: false });
        finalOutcome = { kind: 'refused', reason: response.text.slice(0, 200), attempts, latencyMs };
        break;
      }

      if (response.truncated) {
        const issues: Issue[] = [
          { path: '(root)', message: 'Output hit the token budget', type: 'truncated', severity: 'block' },
        ];
        collectedIssues.push(...issues);
        this.trace({ traceId, request, attempt, outcome: 'truncated', issues, flags: [], response, latencyMs, cached: false });
        finalOutcome = { kind: 'truncated', attempts, latencyMs };
        break;
      }

      // Chapter 06 §06.2 step 3a — the SHAPE.
      if (!parsed.ok) {
        collectedIssues.push(...parsed.issues);
        this.trace({ traceId, request, attempt, outcome: 'invalid', issues: parsed.issues, flags: [], response, latencyMs, cached: false });
        repair = buildRepairPrompt({ previous: response.text, issues: parsed.issues, attempt });
        continue; // -> the repair cycle, bounded by `budget`
      }

      // Chapter 06 §06.2 step 3b — the MEANING.
      const semanticIssues = runSemanticRules(parsed.value, {
        now,
        directory: request.directory ?? new Set<string>(),
        sourceText: request.text,
      });
      const { blocking, reviews } = splitBySeverity(semanticIssues);
      const flags = reviews.map((issue) => `${issue.path}: ${issue.message}`);
      collectedFlags.push(...flags);
      if (flags.length > 0) flagged = true;

      if (blocking.length > 0) {
        collectedIssues.push(...blocking);
        this.trace({ traceId, request, attempt, outcome: 'invalid', issues: blocking, flags, response, latencyMs, cached: false });
        repair = buildRepairPrompt({ previous: response.text, issues: blocking, attempt });
        continue;
      }

      // Chapter 06 §06.2 step 5 — accept. A `review` object is accepted AND
      // flagged, which is what prevents over-rejecting good data (§06.6.1).
      const clean = attempt === 1 && collectedIssues.length === 0;

      if (clean) {
        this.trace({ traceId, request, attempt, outcome: 'ok', issues: [], flags, response, latencyMs, cached: false });
        finalOutcome = { kind: 'ok', value: parsed.value, attempts, enforcement: this.enforcement.rung, cached: false, latencyMs };
      } else {
        this.trace({ traceId, request, attempt, outcome: 'repaired', issues: collectedIssues, flags, response, latencyMs, cached: false });
        finalOutcome = {
          kind: 'repaired',
          value: parsed.value,
          attempts,
          issues: collectedIssues,
          enforcement: this.enforcement.rung,
          cached: false,
          latencyMs,
        };
      }
      break;
    }

    // Chapter 06 §06.9 — the ladder's last rung. Never a throw, never raw text.
    if (!finalOutcome) {
      const reason = collectedIssues.map((issue) => `${issue.path}: ${issue.message}`).join('; ') || 'no usable object';
      const degraded = buildDegradedMeeting(reason, {
        now,
        schemaVersion: SCHEMA_VERSION,
        ...(request.timeZone ? { timeZone: request.timeZone } : {}),
      });

      this.deps.metrics.recordTrace({
        traceId,
        tenantId: request.tenantId,
        task: 'meeting_extraction',
        schemaVersion: SCHEMA_VERSION,
        model,
        provider: this.deps.provider.name,
        attempt: attempts,
        enforcement: this.enforcement.rung,
        outcome: 'degraded',
        issues: collectedIssues.map((issue) => ({ path: issue.path, type: issue.type })),
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startedAt,
        semanticFlags: ['degraded'],
        cached: false,
        at: new Date().toISOString(),
      });

      finalOutcome = {
        kind: 'degraded',
        value: degraded as unknown as Meeting,
        reason,
        issues: collectedIssues,
        attempts,
        cached: false,
        latencyMs: Date.now() - startedAt,
      };
    }

    /**
     * Chapter 09 §09.2 — ONE call summary per call, at the single exit.
     *
     * The invariant to assert: `attempts >= calls`, and `attempts - calls` is the
     * number of repairs. Writing this per attempt is the classic metrics bug.
     */
    this.deps.metrics.recordCall({
      traceId,
      tenantId: request.tenantId,
      outcome: finalOutcome,
      totalLatencyMs: Date.now() - startedAt,
      flagged,
      cached: false,
      enforcement: this.enforcement.rung,
    });

    // Chapter 05 §05.8.1 — only successful outcomes are cached. Caching a refusal
    // or a degraded object would freeze a transient failure for the whole TTL.
    if (finalOutcome.kind === 'ok' || finalOutcome.kind === 'repaired') {
      this.deps.cache.set(cacheKey, finalOutcome);
    }

    return finalOutcome;
  }

  /**
   * Chapter 06 §06.2 — one attempt: call, then parse and validate the shape.
   *
   * Returns `null` for a transport failure, so the loop can distinguish "the model
   * said something unusable" (repairable) from "the provider was unreachable"
   * (not repairable — chapter 06 §06.3).
   */
  private async attempt(input: {
    request: ExtractionRequest;
    system: string;
    repair: string | undefined;
    traceId: string;
  }): Promise<AttemptResult | null> {
    const completionRequest: CompletionRequest = {
      system: input.system,
      user: input.request.text,
      ...(input.repair ? { repair: input.repair } : {}),
      enforcement: this.enforcement.rung,
      wireTarget: 'openai',
      maxOutputTokens: RELIABILITY.maxOutputTokens,
      temperature: config.AI_TEMPERATURE,
      traceId: input.traceId,
      tenantId: input.request.tenantId,
      timeoutMs: RELIABILITY.providerTimeoutMs,
      ...(input.request.signal ? { signal: input.request.signal } : {}),
    };

    try {
      const response = await this.deps.provider.complete(completionRequest);
      this.deps.metrics.recordDebug(input.traceId, input.request.tenantId, response.text);
      return { parsed: this.parse(response.text), response };
    } catch (error) {
      const classified = error instanceof ProviderError ? error : null;
      logger.error(
        {
          traceId: input.traceId,
          tenantId: input.request.tenantId,
          failure: classified?.failure ?? 'provider_error',
          retryable: classified?.retryable ?? false,
        },
        'provider call failed',
      );
      return null;
    }
  }

  /**
   * Chapter 06 §06.2 step 2 and 3a — parse, then validate the SHAPE.
   *
   * The only place in the codebase where raw model text is touched. Errors are
   * DATA: logged, counted, aggregated and turned into a repair prompt.
   */
  private parse(raw: string): { ok: true; value: Meeting } | { ok: false; issues: Issue[] } {
    const parsed = safeJsonParse(raw);
    if (!parsed.ok) {
      return {
        ok: false,
        issues: [{ path: '(root)', message: `Not parseable JSON: ${parsed.reason}`, type: 'parse_error', severity: 'block' }],
      };
    }

    const result = MeetingSchema.safeParse(parsed.value);
    if (!result.success) return { ok: false, issues: fromZodIssues(result.error.issues) };

    return { ok: true, value: result.data };
  }

  /** Chapter 09 §09.6 — one trace per attempt. Paths and types, never values. */
  private trace(input: {
    traceId: string;
    request: ExtractionRequest;
    attempt: number;
    outcome: string;
    issues: readonly Issue[];
    flags: readonly string[];
    response: ProviderResponse;
    latencyMs: number;
    cached: boolean;
  }): void {
    const trace: Trace = {
      traceId: input.traceId,
      tenantId: input.request.tenantId,
      task: 'meeting_extraction',
      schemaVersion: SCHEMA_VERSION,
      model: input.response.model,
      provider: input.response.provider,
      attempt: input.attempt,
      enforcement: input.response.enforcement,
      outcome: input.outcome,
      issues: input.issues.map((issue) => ({ path: issue.path, type: issue.type })),
      inputTokens: input.response.inputTokens,
      outputTokens: input.response.outputTokens,
      latencyMs: input.latencyMs,
      semanticFlags: input.flags,
      cached: input.cached,
      at: new Date().toISOString(),
    };
    this.deps.metrics.recordTrace(trace);
  }
}

/** Chapter 06 §06.6.1 — re-exported so a test can assert the severity policy. */
export { isBlocking };


