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
  // ...plus the words the demo prompts use, so the token counts look realistic.
  "▁You", "▁are", "▁a", "▁support", "▁agent", "▁Answer", "▁only", "▁from",
  "▁policy", "▁below", "▁allowed", "▁within", "▁days", "▁for", "▁damaged",
  "▁items", "▁delivery", "▁My", "▁arrived", "▁ago", "▁Can", "▁get", "▁refund",
  "▁fine", "▁hi", "▁how", "▁help", "▁late", "▁user", "▁assistant",
];

/** Continuation pieces - the "rare words decompose" half (§04.4). */
const SUBWORD_PIECES: string[] = [
  "▁", "ally", "ically", "est", "er", "ing", "auto", "matic", "program", "ming", "berry",
  "▁.", "▁,", "▁!", "▁?", // " ." is one token, exactly as a real vocabulary has it
];

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

/** One step of the walk: the piece, and the span of the original text it covers. */
type Piece = { token: TokenStr; start: number; end: number };

/**
 * Stage 2 - tokenize. Greedy longest match, exactly like WordPiece encoding
 * (§04.4): take the longest piece that fits, else one character, else <UNK>.
 */
function walk(text: RawText): Piece[] {
  const normalised = normalize(text);
  if (normalised.length === 0) return [];

  // Every space becomes "▁", so whitespace belongs to the token (§02.8, invariant 4).
  const marked = `▁${normalised.replace(/ /g, "▁")}`;
  const pieces: Piece[] = [];
  let cursor = 0;

  while (cursor < marked.length) {
    const { token, consumed } = longestMatch(marked.slice(cursor));
    // walk() works on "▁" + text, so marked index i is original index i - 1.
    // The leading "▁" of the first token is virtual, which is why that span starts at 0.
    pieces.push({ token, start: Math.max(0, cursor - 1), end: cursor + consumed - 1 });
    cursor += consumed; // consumed counts INPUT characters, never the length of "<UNK>"
  }

  return pieces;
}

/** The longest vocabulary entry that fits here, or one character, or <UNK>. */
function longestMatch(rest: string): { token: TokenStr; consumed: number } {
  for (let length = Math.min(MAX_PIECE_LENGTH, rest.length); length > 0; length--) {
    const candidate = rest.slice(0, length);
    if (ID_BY_PIECE.has(candidate)) return { token: candidate, consumed: length };
  }
  return { token: SPECIAL.UNK, consumed: 1 }; // one unknown character -> one <UNK>
}

/** Stage 2 as a plain list of token strings. */
export function tokenize(text: RawText): TokenStr[] {
  return walk(text).map((piece) => piece.token);
}

/** Stage 3 - the vocabulary lookup: token strings become integer ids. */
export function toIds(tokens: TokenStr[]): TokenId[] {
  return tokens.map(idOf);
}

/** The forward pipeline of §02.6, with the offsets that §03.10 asks for. */
export function encode(text: RawText): Encoded {
  const pieces = walk(text);
  return {
    tokens: pieces.map((piece) => piece.token),
    ids: pieces.map((piece) => idOf(piece.token)),
    offsets: pieces.map((piece) => [piece.start, piece.end] as [number, number]),
    specialTokensMask: pieces.map(() => false),
  };
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

