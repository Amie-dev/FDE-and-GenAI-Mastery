import { config } from "../config/config";
import type { Granularity } from "../types";
import { normalize, tokenize } from "./tokenizerService";

/**
 * Chapter 03 - the three granularities, run on the same sentence.
 *
 *   word    : smallest sequence, enormous vocabulary, OOV destroys meaning (§03.2)
 *   char    : no OOV at all, but far more positions and O(N^2) attention (§03.3)
 *   subword : the equilibrium every modern LLM ships (§03.5)
 */

/** Words we pretend the word-level vocabulary contains. Anything else is OOV. */
const KNOWN_WORDS = new Set([
  "i", "love", "programming", "the", "cat", "sat", "on", "mat", "capital", "of",
  "india", "is", "delhi", "a", "bug", "because", "it", "works", "hello", "am",
  ",", ".", "!", "?", // punctuation is a token, not a word: it should not be reported as OOV
]);

const PUNCTUATION = /([.,!?;:'"()[\]])/g;

/** Word level: split on spaces, then give punctuation its own token. */
export function tokenizeWord(text: string): string[] {
  return normalize(text)
    .split(" ")
    .flatMap((word) => word.replace(PUNCTUATION, " $1 ").split(" "))
    .filter((piece) => piece.length > 0);
}

/** Character level: every code point is a token, spaces included. */
export function tokenizeChar(text: string): string[] {
  return [...normalize(text)];
}

/** Subword: the vocabulary + greedy longest match from tokenizerService (§03.5). */
export function tokenizeSubword(text: string): string[] {
  return tokenize(text);
}

export type StrategyResult = {
  granularity: Granularity;
  tokens: string[];
  count: number;
  positions: number; // every token is one position in the sequence
  attentionOps: number; // N^2 * d_model - why long sequences are expensive (§03.3)
  costVsSubword: number; // how many times more attention work than subword
  oov?: string[]; // word level only: tokens the vocabulary does not contain
  tokensWithUnk?: string[]; // ...and what they become instead
};

/** Run all three granularities and compare their sequence length and attention cost. */
export function compare(text: string): { text: string; dModel: number; results: StrategyResult[]; note: string } {
  const wordTokens = tokenizeWord(text);
  const oov = wordTokens.filter((token) => !KNOWN_WORDS.has(token.toLowerCase()));

  const build = (granularity: Granularity, tokens: string[], extra: Partial<StrategyResult> = {}): StrategyResult => ({
    granularity,
    tokens,
    count: tokens.length,
    positions: tokens.length,
    attentionOps: tokens.length * tokens.length * config.dModel,
    costVsSubword: 0, // filled in below
    ...extra,
  });

  const results = [
    build("word", wordTokens, {
      oov,
      tokensWithUnk: wordTokens.map((token) => (oov.includes(token) ? "<UNK>" : token)),
    }),
    build("char", tokenizeChar(text)),
    build("subword", tokenizeSubword(text)),
  ];

  const subwordOps = results[2].attentionOps;
  for (const result of results) {
    result.costVsSubword = Number((result.attentionOps / subwordOps).toFixed(2));
  }

  return {
    text: normalize(text),
    dModel: config.dModel,
    results,
    note: "Same text, three prices. Subword is the baseline every ratio is measured against.",
  };
}
