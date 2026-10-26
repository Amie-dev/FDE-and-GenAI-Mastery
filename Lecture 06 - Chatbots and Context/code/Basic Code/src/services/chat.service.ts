import { config, CONTEXT_POLICY } from '../config/config.js';
import { COMPACTION_SPEC, REFUSAL_TEXT } from '../config/prompts.js';
import { callModel } from '../lib/llm.js';
import type { AssemblyReport, ChatTurn, Finding, GroundedAnswer, KbChunk, SessionState } from '../types/chat.types.js';
import { assembleContext } from './context.service.js';
import { searchKnowledge } from './grounding.service.js';
import { hasBlocking, sanitizeInput, screenOutput } from './guardrail.service.js';
import { getFactsForUser } from './memory.service.js';
import { appendAssistant, appendCompacted, appendUser, recordLedger, setRunningSummary } from './session.service.js';

/**
 * Chapter 08 §08.6 — the orchestrator: one message, end to end.
 *
 * This file is the only place where chapters 01-07 meet, and the order of the
 * steps IS the architecture. Both the buffered path (`runTurn`) and the streamed
 * path (used by the controller) go through `prepareTurn` and `finaliseTurn`, so
 * they cannot drift apart.
 */

export interface PreparedTurn {
  session: SessionState;
  ok: boolean;
  refusal?: GroundedAnswer;
  messages: ChatTurn[];
  report: AssemblyReport;
  chunks: KbChunk[];
  findings: Finding[];
}

export interface TurnTiming {
  inputTokens: number;
  outputTokens: number;
  ttftMs?: number; // chapter 05 §05.3
  itlMs?: number; // chapter 05 §05.3
}

export interface TurnOutcome extends GroundedAnswer {
  sessionId: string;
  context: AssemblyReport;
  usage: { model: string; inputTokens: number; outputTokens: number; latencyMs: number };
}

/** Chapters 02-04 + 07 — everything the prompt needs, read before assembly. */
const collectContext = (session: SessionState, text: string) => {
  const chunks = searchKnowledge(text, config.RAG_TOP_K); // §07.4 layer 2
  const facts = getFactsForUser(session.userId, config.MEMORY_TOP_K, text); // §04.9
  const report = assembleContext(session, text, facts, chunks); // chapter 03
  return { chunks, facts, report };
};

/**
 * Chapters 07 → 03 → 01, in that order.
 *
 * Layer 1 (input validation) runs FIRST and alone: a blocked message must never
 * reach retrieval, the memory store or the token budget. Nothing is persisted
 * for a blocked turn, because the turn never happened.
 */
export const prepareTurn = (session: SessionState, rawText: string): PreparedTurn => {
  const input = sanitizeInput(rawText, config.MAX_INPUT_CHARS); // §07.3

  if (!input.ok) {
    const { report } = collectContext(session, '');
    const refusal: GroundedAnswer = {
      answer: REFUSAL_TEXT,
      isRefusal: true,
      citations: [],
      verification: { ok: true, checked: 0, ratio: 1, problems: [] },
      findings: input.findings,
    };
    return { session, ok: false, refusal, messages: [], report, chunks: [], findings: input.findings };
  }

  const { chunks, report } = collectContext(session, input.text);

  // Chapter 01 §01.11 — persist the user turn BEFORE the model call, so a crash
  // mid-generation cannot lose a message the user already saw. The assembly above
  // used the *previous* turns, so the current turn is not duplicated.
  appendUser(session.sessionId, input.text);

  return { session, ok: true, messages: report.messages, report, chunks, findings: input.findings };
};

/**
 * Chapters 02 + 03 + 04 — the same assembly, with no model call and no writes.
 * This is the endpoint that lets you study the budget with zero spend.
 */
export const previewTurn = (session: SessionState, rawText: string) => {
  const input = sanitizeInput(rawText, config.MAX_INPUT_CHARS);
  const { chunks, facts, report } = collectContext(session, input.text);
  return { input, facts, chunks, report };
};

/**
 * Chapter 07 §07.8 + chapter 01 §01.6 — verify, then close the loop.
 * Called by BOTH paths, so a streamed answer is verified exactly like a buffered one.
 */
export const finaliseTurn = (prepared: PreparedTurn, raw: string, timing: TurnTiming): GroundedAnswer => {
  const screened = screenOutput(raw, prepared.chunks, config.CITATION_MATCH_THRESHOLD, config.STRICT_VERIFICATION);

  // §07.8 policy — strict mode fails closed: an unverified answer becomes a refusal.
  const blocked = hasBlocking(screened.findings);
  const answer = blocked ? REFUSAL_TEXT : screened.answer;

  appendAssistant(prepared.session.sessionId, answer);

  // Chapter 02 §02.9 step 4 — per-turn telemetry, or every budget debate is an argument.
  recordLedger(prepared.session.sessionId, {
    at: Date.now(),
    inputTokens: timing.inputTokens,
    outputTokens: timing.outputTokens,
    tokensByTier: prepared.report.tokensByTier,
    historyTrimmed: prepared.report.historyTrimmed,
    refused: blocked || screened.isRefusal, // chapter 06 §06.9 — over-refusal is a metric
    ttftMs: timing.ttftMs,
    itlMs: timing.itlMs,
  });

  return {
    answer,
    isRefusal: blocked || screened.isRefusal,
    citations: blocked ? [] : screened.citations,
    verification: screened.verification,
    findings: [...prepared.findings, ...screened.findings],
  };
};

/** Chapter 08 §08.6 — the buffered path: nothing is visible until generation finishes. */
export const runTurn = async (session: SessionState, rawText: string): Promise<TurnOutcome> => {
  const prepared = prepareTurn(session, rawText);

  if (!prepared.ok) {
    return {
      ...prepared.refusal!,
      sessionId: session.sessionId,
      context: prepared.report,
      usage: { model: 'guardrail', inputTokens: 0, outputTokens: 0, latencyMs: 0 },
    };
  }

  const result = await callModel(prepared.messages);

  const grounded = finaliseTurn(prepared, result.text, {
    // Prefer the provider's real usage; fall back to our Tier-1 estimate.
    inputTokens: result.inputTokens || prepared.report.inputTokens,
    outputTokens: result.outputTokens,
  });

  // Chapter 03 §03.7 design rule — if a strategy adds latency, move it off the
  // hot path. Compaction is that strategy: it runs AFTER the user has their answer.
  await compactIfNeeded(session);

  return {
    ...grounded,
    sessionId: session.sessionId,
    context: prepared.report,
    usage: {
      model: result.model,
      inputTokens: result.inputTokens || prepared.report.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    },
  };
};

/**
 * Chapter 03 §03.4 + §03.8 step 1 — rolling summarisation, off the hot path.
 *
 * The raw older turns are replaced by a running summary in the hot store; the
 * durable transcript lives in the cold store (a database, in production).
 * Returns true when a compaction actually happened.
 */
export const compactIfNeeded = async (session: SessionState): Promise<boolean> => {
  const policy = CONTEXT_POLICY;
  if (!policy.summarise) return false;
  if (session.turns.length <= policy.summariseThreshold) return false;

  // The pinned anchor (§03.3) is never compacted: the first K turns carry the goal
  // and the hard constraints, and they are exactly what "I already told you" means.
  const splitAt = Math.max(policy.anchorTurns, session.turns.length - policy.recentTurns);
  const older = session.turns.slice(policy.anchorTurns, splitAt);
  const keep = session.turns.slice(splitAt);
  if (older.length === 0) return false;

  const segment = older.map((turn) => `${turn.role}: ${turn.content}`).join('\n');
  const result = await callModel([
    { role: 'system', content: COMPACTION_SPEC },
    // The existing summary goes in the assistant role: it is the model's own prior
    // output, so it is echoed back as a commitment rather than re-summarised (ch 01 §01.6).
    ...(session.runningSummary ? ([{ role: 'assistant', content: session.runningSummary }] as ChatTurn[]) : []),
    { role: 'user', content: `[SEGMENT]\n${segment}` },
  ]);

  setRunningSummary(session.sessionId, result.text);
  // Remove from the hot path, keep in the record (§03.4): the transcript survives
  // for audit, and semantic recall can still reach it.
  appendCompacted(session.sessionId, older);
  session.turns = [...session.turns.slice(0, policy.anchorTurns), ...keep];
  return true;
};

