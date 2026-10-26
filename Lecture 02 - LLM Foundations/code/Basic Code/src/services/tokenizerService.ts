import type { Encoded, RawText, TokenId, TokenStr } from "../types";

/**
 * Chapter 02 - the text pipeline, and Chapter 03's comparison target.
 *
 * A fixed vocabulary is "the table that gives IDs their meaning" (§02.5): an id
 * is an index into this list, never a measurement. The "▁" (U+2581) marks a
 * space, exactly like SentencePiece (Chapter 04 §04.5).
 */
export const SPECIAL = { BOS: "<BOS>", EOS: "<EOS>", UNK: "<UNK>" } as const;

/** Whole-word pieces first - the "frequent words stay whole" half of subword tokenization. */
const WORD_PIECES: string[] = [
  "▁the", "▁The", "▁capital", "▁Capital", "▁of", "▁india", "▁India", "▁france",
  "▁France", "▁is", "▁delhi", "▁Delhi", "▁paris", "▁Paris", "▁cat", "▁Cat",
  "▁sat", "▁on", "▁mat", "▁hello", "▁Hello", "▁i", "▁I", "▁am", "▁aminul",
  "▁Aminul", "▁automatic", "▁Automatic", "▁programming", "▁love", "▁straw",
  "▁low", "▁bug", "▁python", "▁truncates", "▁because", "▁it", "▁works",
  "▁word", "▁order", "▁matters",
];

/** Continuation pieces - the "rare words decompose" half (§04.4). */
const SUBWORD_PIECES: string[] = ["▁", "ally", "ically", "est", "er", "ing", "auto", "matic", "program", "ming", "berry"];

/** The last resort: every single character. This is what keeps OOV out. */
const CHARS: string[] = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?'\"-_:;()[]/".split("");

/** The vocabulary, in id order: id = index in this array. */
export const VOCABULARY: string[] = [SPECIAL.BOS, SPECIAL.EOS, SPECIAL.UNK, ...WORD_PIECES, ...SUBWORD_PIECES, ...CHARS];

/** |V| - it shapes the logits vector and the embedding table (Chapter 05). */
export const VOCAB_SIZE = VOCABULARY.length;

const ID_BY_PIECE = new Map<TokenStr, TokenId>(VOCABULARY.map((piece, id) => [piece, id]));
const MAX_PIECE_LENGTH = Math.max(...VOCABULARY.map((piece) => piece.length));

/** Piece -> id. An unknown piece becomes <UNK>, never a crash. */
export function idOf(piece: TokenStr): TokenId {
  return ID_BY_PIECE.get(piece) ?? ID_BY_PIECE.get(SPECIAL.UNK)!;
}

/** Id -> piece. An id outside the vocabulary becomes <UNK>. */
export function pieceOf(id: TokenId): TokenStr {
  return VOCABULARY[id] ?? SPECIAL.UNK;
}

/** Stage 1 - normalise. Unicode form first, whitespace second (§02.8, invariant 5). */
export function normalize(text: RawText): RawText {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/**
 * Stage 2 - tokenize. Greedy longest match, exactly like WordPiece encoding
 * (§04.4): try the longest piece that fits, fall back to one character.
 */
export function tokenize(text: RawText): TokenStr[] {
  const normalised = normalize(text);
  if (normalised.length === 0) return [];

  // Every space becomes "▁", so whitespace belongs to the token (§02.8, invariant 4).
  const marked = `▁${normalised.replace(/ /g, "▁")}`;
  const tokens: TokenStr[] = [];
  let cursor = 0;

  while (cursor < marked.length) {
    const piece = longestMatch(marked.slice(cursor));
    tokens.push(piece);
    cursor += piece.length;
  }

  return tokens;
}

/** The longest vocabulary entry that fits here, or a single character, or <UNK>. */
function longestMatch(rest: string): TokenStr {
  for (let length = Math.min(MAX_PIECE_LENGTH, rest.length); length > 0; length--) {
    const candidate = rest.slice(0, length);
    if (ID_BY_PIECE.has(candidate)) return candidate;
  }
  return SPECIAL.UNK; // only reachable for characters outside the vocabulary
}

/** Stage 3 - the vocabulary lookup: token strings become integer ids. */
export function toIds(tokens: TokenStr[]): TokenId[] {
  return tokens.map(idOf);
}

/** The forward pipeline of §02.6, with the offsets that §03.10 asks for. */
export function encode(text: RawText): Encoded {
  const tokens = tokenize(text);
  const ids: TokenId[] = [];
  const offsets: [number, number][] = [];
  let cursor = 0;

  for (const token of tokens) {
    // tokenize() works on "▁" + text, so marked index i is original index i - 1.
    // The first "▁" is virtual, which is why the span starts at 0 there.
    const start = Math.max(0, cursor - 1);
    offsets.push([start, cursor + token.length - 1]);
    cursor += token.length;
    ids.push(idOf(token));
  }

  return { tokens, ids, offsets, specialTokensMask: tokens.map(() => false) };
}

/**
 * Chat mode: the template adds <BOS> and <EOS> and marks them as NOT user text,
 * so token accounting matches the provider's (§02.8, invariant 6).
 */
export function encodeChat(text: RawText): Encoded {
  const inner = encode(text);
  return {
    tokens: [SPECIAL.BOS, ...inner.tokens, SPECIAL.EOS],
    ids: [idOf(SPECIAL.BOS), ...inner.ids, idOf(SPECIAL.EOS)],
    offsets: [[0, 0], ...inner.offsets, [text.length, text.length]] as [number, number][],
    specialTokensMask: [true, ...inner.specialTokensMask, true],
  };
}

/** Stage 8, backwards - detokenise. Decode the WHOLE buffer, never one token (§02.7). */
export function decode(ids: TokenId[]): RawText {
  return ids
    .map(pieceOf)
    .filter((piece) => piece !== SPECIAL.BOS && piece !== SPECIAL.EOS)
    .join("")
    .replace(/▁/g, " ")
    .trimStart();
}

/** Cost and context accounting use this, never word counts (§03.10). */
export function countTokens(text: RawText): number {
  return tokenize(text).length;
}

