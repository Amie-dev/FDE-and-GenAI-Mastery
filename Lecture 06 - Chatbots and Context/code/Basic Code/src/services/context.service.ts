import { config, CONTEXT_POLICY } from '../config/config.js';
import type { AssemblyReport, ChatTurn, KbChunk, SessionState, Tier, UserFact } from '../types/chat.types.js';
import { buildGroundedSystemPrompt, renderContext } from './grounding.service.js';
import { renderFacts } from './memory.service.js';
import { MESSAGE_OVERHEAD_TOKENS, contentWords, estimateTokens } from './token.service.js';

/**
 * Chapter 03 — the context manager.
 *
 * One manager with a declarative policy beats five bespoke code paths (§03.8).
 * `assembleContext` is the HOT PATH: pure, deterministic, allocation-light and
 * free of model calls. Compaction costs a model call, so it lives in
 * `chat.service.ts` and runs AFTER the response (chapter 03 §03.7 design rule).
 */

/** §03.8 step 3 — the only subtle loop: a newest-first walk with a hard guarantee. */
export const takeNewestWithinBudget = (turns: ChatTurn[], budget: number): ChatTurn[] => {
  const kept: ChatTurn[] = [];
  let used = 0;

  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index]!;
    const cost = estimateTokens(turn.content) + MESSAGE_OVERHEAD_TOKENS;
    // The `kept.length > 0` guard prevents the empty-history failure mode (§03.2).
    if (used + cost > budget && kept.length > 0) break;
    kept.unshift(turn);
    used += cost;
  }

  return kept;
};

/**
 * §03.5 — semantic recall over historical turns.
 * Keyword overlap stands in for a vector store; the contract is the same:
 * retrieve by *relevance*, and never let recall replace chronological recency.
 */
export const recallHistoricalTurns = (turns: ChatTurn[], query: string, k: number): ChatTurn[] => {
  if (k <= 0) return [];

  const terms = contentWords(query);
  if (terms.length === 0) return [];

  return turns
    .map((turn, index) => {
      const haystack = turn.content.toLowerCase();
      return { turn, index, score: terms.filter((term) => haystack.includes(term)).length };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, k)
    .map((row) => row.turn);
};

/**
 * Chapter 03 §03.6 — the layered pipeline, assembled in time-horizon order.
 * Layer 0 system · 1 memory · 2 summary · 3 anchor · 4 recall · 5 recent · 6 current.
 */
export const assembleContext = (session: SessionState, query: string, facts: UserFact[], chunks: KbChunk[]): AssemblyReport => {
  const policy = CONTEXT_POLICY;
  const notes: string[] = [];
  const messages: ChatTurn[] = [];
  const tokensByTier: Record<Tier, number> = { system: 0, memory: 0, grounded: 0, history: 0, current: 0 };

  const push = (tier: Tier, turn: ChatTurn): void => {
    messages.push(turn);
    tokensByTier[tier] += estimateTokens(turn.content) + MESSAGE_OVERHEAD_TOKENS;
  };

  // ---- Layer 0 — system prompt & SOP: deploy-time, never dropped (§03.6) ----
  push('system', { role: 'system', content: buildGroundedSystemPrompt() });

  // ---- Layer 1 — durable user memory: permanent, high priority (§04.9) ----
  if (facts.length > 0) push('memory', { role: 'system', content: renderFacts(facts) });

  // ---- Layer 2 — running summary: compressed older turns (§03.4) ----
  if (session.runningSummary) {
    push('history', { role: 'system', content: `[CONVERSATION BACKGROUND]\n${session.runningSummary}` });
  }

  // ---- Layer 2b — grounding: the evidence block the refusal policy refers to (§07.4) ----
  push('grounded', { role: 'system', content: `[CONTEXT]\n${renderContext(chunks)}` });

  // ---- Layer 3 — pinned anchor: the first K turns, where the scope was set (§03.3) ----
  const anchor = policy.anchorTurns > 0 ? session.turns.slice(0, policy.anchorTurns) : [];
  const rest = session.turns.slice(anchor.length);
  for (const turn of anchor) push('history', turn);
  if (anchor.length > 0) notes.push(`anchor: first ${anchor.length} turn(s) pinned (K=${policy.anchorTurns}).`);

  // ---- Layer 4 — semantic recall (§03.5) ----
  // The recall pool is the durable transcript plus whatever middle turns are still
  // hot. In production this is a vector index over the cold store, not an array scan,
  // and recall is always ADDITIVE — it never replaces chronological recency.
  const hotMiddle = rest.slice(0, Math.max(0, rest.length - policy.recentTurns));
  const recalled = recallHistoricalTurns([...session.compacted, ...hotMiddle], query, policy.semanticRecall);
  if (recalled.length > 0) {
    const block = ['[RELEVANT EARLIER TURNS]', ...recalled.map((turn) => `${turn.role}: ${turn.content}`)].join('\n');
    push('history', { role: 'system', content: block });
    notes.push(`semantic recall: ${recalled.length} earlier turn(s) re-injected (k=${policy.semanticRecall}).`);
  }

  // ---- Layer 5 — recent verbatim window: token-budgeted, newest first (§03.2) ----
  const recalledSet = new Set(recalled);
  const pool = rest.filter((turn) => !recalledSet.has(turn));
  const historyBudget = Math.max(0, policy.budgetTokens - tokensByTier.history);
  const recent = takeNewestWithinBudget(pool, historyBudget);
  for (const turn of recent) push('history', turn);

  const historyTrimmed = pool.length - recent.length;
  if (historyTrimmed > 0) notes.push(`eviction: ${historyTrimmed} older turn(s) dropped from the verbatim window.`);

  // ---- Layer 6 — the current turn: never truncated (§02.9 tier 5) ----
  push('current', { role: 'user', content: query });

  const inputTokens = Object.values(tokensByTier).reduce((total, value) => total + value, 0);

  return {
    messages,
    tokensByTier,
    inputTokens,
    outputReserve: config.AI_MAX_TOKENS,
    contextWindow: config.CONTEXT_WINDOW_TOKENS,
    historyKept: recent.length,
    historyTrimmed,
    anchorTurns: anchor.length,
    recalledTurns: recalled.length,
    summaryPresent: Boolean(session.runningSummary),
    // Chapter 02 §02.1 — L_input + L_output <= C_max, or you starve the answer.
    fits: inputTokens + config.AI_MAX_TOKENS <= config.CONTEXT_WINDOW_TOKENS,
    notes,
  };
};
