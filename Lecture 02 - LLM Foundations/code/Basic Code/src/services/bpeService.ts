import type { Merge } from "../types";

/**
 * Chapter 04 - BPE, the algorithm of §04.10.
 *
 * Note the asymmetry: TRAINING is global (it looks at the whole corpus and
 * chooses the merge ORDER), while ENCODING is local and greedy (it applies that
 * fixed order left to right). That is why encoding is fast enough to run on
 * every request, and why the merge list must be shipped exactly as it was learned.
 */

/** The end-of-word marker: it is what stops merges from running across words. */
export const END_OF_WORD = "</w>";

/** The hand-written merge list from the §04.8 gate exercise, in its learned order. */
export const NOTE_MERGES: Merge[] = [
  ["l", "o"],
  ["lo", "w"],
  ["w", END_OF_WORD],
  ["e", "r"],
  ["e", "s"],
  ["es", "t"],
];

/** The corpus the notes use: low x5, lower x2, lowest x1. */
export const NOTE_CORPUS: string[] = ["low", "low", "low", "low", "low", "lower", "lower", "lowest"];

export type BpeModel = {
  merges: Merge[]; // the ordered merge list - this IS the tokenizer
  vocab: string[]; // base characters plus every piece the merges created
  baseVocab: string[];
  targetVocabSize: number;
};

/** Base pieces of one word: single characters plus the end-of-word marker. */
function splitIntoPieces(word: string): string[] {
  return [...word, END_OF_WORD];
}

/** Replace every non-overlapping (a, b) occurrence with "ab", left to right. */
function applyMerge(pieces: string[], [a, b]: Merge): string[] {
  const merged: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    if (i < pieces.length - 1 && pieces[i] === a && pieces[i + 1] === b) {
      merged.push(a + b);
      i++; // consume b as well
    } else {
      merged.push(pieces[i]);
    }
  }
  return merged;
}

/** Count adjacent pairs, weighted by how often the word appears in the corpus. */
function countPairs(words: string[][]): Map<string, { pair: Merge; count: number }> {
  const counts = new Map<string, { pair: Merge; count: number }>();
  for (const pieces of words) {
    for (let i = 0; i < pieces.length - 1; i++) {
      const key = `${pieces[i]}\u0000${pieces[i + 1]}`;
      const found = counts.get(key);
      if (found) found.count += 1;
      else counts.set(key, { pair: [pieces[i], pieces[i + 1]], count: 1 });
    }
  }
  return counts;
}

/** The most frequent pair. Ties go to the pair seen first, so training is deterministic. */
function mostFrequentPair(counts: Map<string, { pair: Merge; count: number }>): { pair: Merge; count: number } | null {
  let best: { pair: Merge; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best;
}


/**
 * Training: count, merge, repeat - until the vocabulary is big enough or no
 * pair is worth merging. This runs ONCE, by the model authors, over a huge corpus.
 */
export function trainBPE(corpus: string[], targetVocabSize = 40): BpeModel {
  const words = corpus.map((word) => splitIntoPieces(word.toLowerCase()));
  const baseVocab = [...new Set(words.flat())].sort();
  const vocab = new Set(baseVocab);
  const merges: Merge[] = [];

  while (vocab.size < targetVocabSize) {
    const pairCounts = countPairs(words);
    const best = mostFrequentPair(pairCounts);
    if (!best || best.count < 2) break; // nothing useful left to merge

    merges.push(best.pair); // the ORDER is remembered: it defines encoding
    vocab.add(best.pair.join(""));
    for (let i = 0; i < words.length; i++) words[i] = applyMerge(words[i], best.pair);
  }

  return { merges, vocab: [...vocab], baseVocab, targetVocabSize };
}

/** The trained-once model this app ships, so /bpe/encode works without training first. */
export const DEMO_MODEL: BpeModel = trainBPE(NOTE_CORPUS, 40);

/** A trailing bare "</w>" is folded into the piece before it, like real vocabularies do. */
function foldEndOfWord(pieces: string[]): string[] {
  if (pieces.length >= 2 && pieces[pieces.length - 1] === END_OF_WORD) {
    return [...pieces.slice(0, -2), pieces[pieces.length - 2] + END_OF_WORD];
  }
  return pieces;
}

/** Encoding: split into base pieces, then apply the merges in learned order. */
export function encodeWithMerges(text: string, merges: Merge[]): { words: string[][]; pieces: string[] } {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      let pieces = splitIntoPieces(word);
      for (const merge of merges) pieces = applyMerge(pieces, merge);
      return foldEndOfWord(pieces);
    });

  return { words, pieces: words.flat() };
}

/** Decoding: the marker means "a word ended here", so it becomes a space. */
export function decodePieces(pieces: string[]): string {
  return pieces
    .map((piece) => piece.replaceAll(END_OF_WORD, " "))
    .join("")
    .trim();
}

/**
 * §04.8 part 2 - the fix for "how many r's are in strawberry?".
 * Counting characters is exact in code and unreliable in the model: do it here.
 */
export function countLetters(text: string, letter: string): { text: string; letter: string; count: number } {
  const target = [...letter][0] ?? "";
  return { text, letter: target, count: [...text].filter((character) => character === target).length };
}
