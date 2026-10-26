import { countTokens as exactCount } from 'gpt-tokenizer';
import type { ChatTurn } from '../types/chat.types.js';

/**
 * Chapter 02 §02.4 — token arithmetic, in two tiers.
 *
 * Tier 1 (estimate) is used to *decide*: it runs on every candidate message
 * during trimming, so it must be free.
 * Tier 2 (exact) is used to *report and to enforce*: it runs once, on the final
 * assembled payload. Never mix the two roles.
 */

/** Every message carries role/separator overhead on top of its content. */
export const MESSAGE_OVERHEAD_TOKENS = 4;

/** Content words only — punctuation and short stopwords are noise (§07.8). */
export const contentWords = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4);

/** Chapter 02 §02.4 tier 1 — the cheap heuristic: 1 token ≈ 4 characters. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/** Chapter 02 §02.4 tier 2 — the real BPE encoder, for billing and hard limits. */
export const countTokens = (text: string): number => exactCount(text);

/** The estimate for a whole message array, including per-message overhead. */
export const estimateTokensOfTurns = (turns: ChatTurn[]): number =>
  turns.reduce((total, turn) => total + estimateTokens(turn.content) + MESSAGE_OVERHEAD_TOKENS, 0);

/**
 * Chapter 02 §02.5 — the quadratic accumulation problem.
 *
 * Naive appending resends every prior turn on every request, so turn k costs
 * `S + (k-1)·Δ + Q`. The per-request cost looks reasonable; the *cumulative*
 * bill grows quadratically. A managed window is bounded, so it grows linearly.
 */
export interface AccumulationRow {
  turn: number;
  naiveInputTokens: number; // this request, naive appending
  naiveCumulativeTokens: number; // Σ of every request so far
  managedInputTokens: number; // this request, bounded window
  managedCumulativeTokens: number;
}

export const projectAccumulation = (options: {
  turns: number;
  systemTokens: number; // S
  expansionPerTurn: number; // Δ = U + A
  windowTurns: number; // how many turns the managed window keeps
  inputBudget: number; // B_input — the hard ceiling
}): AccumulationRow[] => {
  const { turns, systemTokens, expansionPerTurn, windowTurns, inputBudget } = options;

  let naiveCumulative = 0;
  let managedCumulative = 0;

  return Array.from({ length: turns }, (_unused, index) => {
    const turn = index + 1;

    const naiveInputTokens = systemTokens + turn * expansionPerTurn;
    const managedInputTokens = Math.min(systemTokens + Math.min(turn, windowTurns) * expansionPerTurn, inputBudget);

    naiveCumulative += naiveInputTokens;
    managedCumulative += managedInputTokens;

    return { turn, naiveInputTokens, naiveCumulativeTokens: naiveCumulative, managedInputTokens, managedCumulativeTokens: managedCumulative };
  });
};
