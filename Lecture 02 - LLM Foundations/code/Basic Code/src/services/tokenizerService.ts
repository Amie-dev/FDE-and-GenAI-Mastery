import { getEncoding, getEncodingNameForModel, type Tiktoken, type TiktokenModel } from "js-tiktoken";
import { config } from "../config/config";
import type { Encoded, RawText, TokenId, TokenPiece, TokenStr } from "../types";

/**
 * Chapter 02 - the text pipeline, running a REAL tokenizer.
 *
 * `js-tiktoken` is the JavaScript port of OpenAI's `tiktoken`: the same BPE rank
 * tables the models are trained with, shipped offline. Nothing here is hand-rolled,
 * so the counts are the counts a provider bills for - the only number that matters
 * in Chapter 05.
 *
 * Three rules this file follows:
 *   1. An id is an index into ONE encoding's vocabulary. Ids are never portable
 *      between encodings (§02.3), so every response names its encoding.
 *   2. `exact` says whether that encoding is really the model's own. A closed
 *      tokenizer (Claude, Gemini) can only be approximated, and an estimate must be
 *      labelled as one (§05.4).
 *   3. Offsets are computed by walking BYTES, not characters. Byte-level BPE happily
 *      splits a character in two, so character counting would be wrong (§02.5).
 */

/** The encodings this service exposes by name. Both ship inside js-tiktoken. */
export const ENCODING_NAMES = ["o200k_base", "cl100k_base"] as const;
export type EncodingName = (typeof ENCODING_NAMES)[number];

/** tiktoken's own version, so a count can be traced back to a tokenizer build (§05.4). */
export const TIKTOKEN_VERSION = "1.0.21";

/**
 * js-tiktoken's published types only declare encode() and decode(), but the instance
 * really carries the byte tables this file needs. Rather than reach for `any`, the
 * runtime shape is written down once, here, and narrowed to at the boundary.
 */
type TiktokenInternals = {
  encode: (text: string, allowedSpecial?: "all" | string[]) => number[];
  decode: (ids: number[]) => string;
  textMap: Map<number, Uint8Array>; // id -> the raw bytes of that token
  specialTokens: Record<string, number>; // "<|endoftext|>" -> 199999
  inverseSpecialTokens: Record<string, string>; // 199999 -> "<|endoftext|>"
};

const internals = (encoding: Tiktoken): TiktokenInternals => encoding as unknown as TiktokenInternals;

const cache = new Map<string, Tiktoken>();

/** Loading a rank table costs ~100 ms, so each encoding is built once and reused. */
function load(name: EncodingName): Tiktoken {
  const found = cache.get(name);
  if (found) return found;
  const encoding = getEncoding(name);
  cache.set(name, encoding);
  return encoding;
}

export type ResolvedEncoding = { name: EncodingName; encoding: Tiktoken; exact: boolean; source: string };

/**
 * Turn whatever the caller sent - an encoding name or a model id - into a real
 * encoding, and say honestly whether it is the right one for that model.
 */
export function resolveEncoding(input?: string): ResolvedEncoding {
  const wanted = typeof input === "string" ? input.trim() : "";

  // 1. An explicit encoding name: exact by definition.
  if ((ENCODING_NAMES as readonly string[]).includes(wanted)) {
    const name = wanted as EncodingName;
    return { name, encoding: load(name), exact: true, source: `encoding ${name}` };
  }

  // 2. A model id tiktoken knows: its own table, so still exact.
  if (wanted.length > 0) {
    try {
      const name = getEncodingNameForModel(wanted as TiktokenModel);
      if ((ENCODING_NAMES as readonly string[]).includes(name)) {
        return { name: name as EncodingName, encoding: load(name as EncodingName), exact: true, source: `model ${wanted}` };
      }
    } catch {
      // The model's tokenizer is closed (Claude, Gemini, ...): fall through and label it.
    }
  }

  // 3. Unknown or absent: the configured default - and never claim it is exact for a model.
  const configured = config.defaultEncoding;
  const name = (ENCODING_NAMES as readonly string[]).includes(configured) ? (configured as EncodingName) : "cl100k_base";
  return {
    name,
    encoding: load(name),
    exact: wanted.length === 0,
    source: wanted.length === 0 ? `configured default: ${name}` : `no public tokenizer for "${wanted}" - approximated with ${name}`,
  };
}

/** |V| of an encoding - it shapes the logits vector and the embedding table (§05.5). */
export function vocabularySize(input?: string): number {
  return internals(resolveEncoding(input).encoding).textMap.size;
}

/** The default encoding's |V|, resolved once at startup. */
export const VOCAB_SIZE = vocabularySize(config.defaultEncoding);

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

/** UTF-8 byte length of one code point: byte-level BPE measures everything in bytes. */
const byteLength = (character: string): number => textEncoder.encode(character).length;

/**
 * Stage 2 and stage 3 of §02.6 in one pass: the ids, the piece each id stands for,
 * and the character span it covers in the text that was actually sent.
 *
 * tiktoken returns ids only, so the pieces are rebuilt from the encoding's own byte
 * table. A token can end in the MIDDLE of a character (an emoji is often two tokens),
 * so `partial` marks those pieces - and the offsets still add up to the whole text.
 */
function toPieces(text: RawText, ids: TokenId[], encoding: Tiktoken): TokenPiece[] {
  const bytesOf = internals(encoding).textMap;
  const specials = internals(encoding).inverseSpecialTokens;
  const codePoints = [...text].map((character) => ({ utf16: character.length, bytes: byteLength(character) }));
  let codePoint = 0;
  let position = 0; // a UTF-16 index, so text.slice(start, end) is exact

  return ids.map((id, index) => {
    const bytes = bytesOf.get(id)?.length ?? 0;
    const start = position;
    let consumed = 0;
    while (consumed < bytes && codePoint < codePoints.length) {
      consumed += codePoints[codePoint].bytes;
      position += codePoints[codePoint].utf16;
      codePoint += 1;
    }
    return {
      index,
      id,
      token: text.slice(start, position),
      bytes,
      start,
      end: position,
      special: Object.prototype.hasOwnProperty.call(specials, id),
      partial: consumed !== bytes,
    };
  });
}

/**
 * NFKC + whitespace collapse. Reported next to the raw text so you can SEE why you must
 * not normalise silently: `encode` never calls this, because the model counts the bytes
 * you actually send (§02.8).
 */
export function normalize(text: RawText): RawText {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/**
 * The forward pipeline of §02.6: text -> tokens -> ids, with offsets, the special-token
 * mask, and the round trip checked on every single call (invariant 1 of §02.8).
 */
export function encode(text: RawText, input?: string): Encoded {
  const { name, encoding, exact } = resolveEncoding(input);
  // "all" lets special tokens through as literal text instead of throwing, so the mask
  // below can say which tokens came from the template and which came from the user.
  const ids = internals(encoding).encode(text, "all");
  const pieces = toPieces(text, ids, encoding);
  const roundTrip = encoding.decode(ids);

  return {
    text,
    encoding: name,
    exact,
    tokens: pieces.map((piece) => piece.token),
    ids,
    count: ids.length,
    offsets: pieces.map((piece) => [piece.start, piece.end] as [number, number]),
    specialTokensMask: pieces.map((piece) => piece.special),
    pieces,
    roundTrip,
    roundTripMatches: roundTrip === text,
  };
}

/**
 * Chat mode: a real template adds real special tokens and marks them as NOT user text,
 * so token accounting matches the provider's (§02.8, invariant 6).
 */
export function encodeChat(text: RawText, input?: string): Encoded {
  const inner = encode(text, input);
  const { encoding } = resolveEncoding(input);
  const specials = internals(encoding).specialTokens;

  const wrap = (id: number | undefined, token: TokenStr, at: number): TokenPiece | null =>
    typeof id === "number" ? { index: -1, id, token, bytes: 0, start: at, end: at, special: true, partial: false } : null;

  const head = wrap(specials["<|endofprompt|>"], "<|endofprompt|>", 0);
  const tail = wrap(specials["<|endoftext|>"], "<|endoftext|>", text.length);
  const pieces = [...(head ? [head] : []), ...inner.pieces, ...(tail ? [tail] : [])].map((piece, index) => ({
    ...piece,
    index,
  }));

  return {
    ...inner,
    tokens: pieces.map((piece) => piece.token),
    ids: pieces.map((piece) => piece.id),
    count: pieces.length,
    offsets: pieces.map((piece) => [piece.start, piece.end] as [number, number]),
    specialTokensMask: pieces.map((piece) => piece.special),
    pieces,
  };
}

/** Stage 8, backwards - detokenise. Decode the WHOLE buffer, never one token (§02.7). */
export function decode(ids: TokenId[], input?: string): RawText {
  return resolveEncoding(input).encoding.decode(ids);
}

/** Id -> piece. A partial character decodes to U+FFFD, which is exactly what a model sees. */
export function pieceOf(id: TokenId, input?: string): TokenStr {
  const { encoding } = resolveEncoding(input);
  const bytes = internals(encoding).textMap.get(id);
  if (bytes) return textDecoder.decode(bytes);
  return internals(encoding).inverseSpecialTokens[String(id)] ?? `<unknown id ${id}>`;
}

/** True when the id is one of the encoding's control tokens - never user text. */
export function isSpecial(id: TokenId, input?: string): boolean {
  return Object.prototype.hasOwnProperty.call(internals(resolveEncoding(input).encoding).inverseSpecialTokens, id);
}

/** Stage 2 as a plain list of token strings (used by the Chapter 03 comparison). */
export function tokenize(text: RawText, input?: string): TokenStr[] {
  return encode(text, input).tokens;
}

/** Cost and context accounting use this, never word counts (§03.10). */
export function countTokens(text: RawText, input?: string): number {
  return encode(text, input).count;
}

export type EncodingComparison = {
  encoding: string;
  exact: boolean;
  source: string;
  tokens: number;
  chars: number;
  charsPerToken: number;
  vocabularySize: number;
  firstTokens: TokenStr[];
  firstIds: TokenId[];
};

/**
 * The roadmap's build task, in code: the same text through more than one tokenizer,
 * side by side. Pass model ids to compare providers; pass encoding names to compare
 * vocabularies. Anything with a closed tokenizer comes back with `exact: false`.
 */
export function compare(text: RawText, inputs: string[] = [...ENCODING_NAMES]) {
  const chars = [...text].length;

  const results: EncodingComparison[] = inputs.map((input) => {
    const { name, exact, source } = resolveEncoding(input);
    const encoded = encode(text, input);
    return {
      encoding: name,
      exact,
      source,
      tokens: encoded.count,
      chars,
      charsPerToken: Number((chars / Math.max(encoded.count, 1)).toFixed(3)),
      vocabularySize: vocabularySize(input),
      firstTokens: encoded.tokens.slice(0, 5),
      firstIds: encoded.ids.slice(0, 5),
    };
  });

  return {
    text,
    chars,
    results,
    note: "Same text, different vocabularies, different bills. `exact: false` means the model's own tokenizer is closed, so read that count as an estimate (§05.4).",
  };
}
