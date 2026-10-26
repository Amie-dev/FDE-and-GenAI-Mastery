/**
 * Chapter 02 (§02.9) - the five stages of the pipeline, written as types.
 * Read them together: each one is the output of one stage and the input of the
 * next, which is why the names must never be mixed up.
 */
export type RawText = string; // exactly what the user sent - the bytes the tokenizer sees
export type TokenStr = string; // a piece of text, e.g. " del" - note the leading space
export type TokenId = number; // an index into ONE encoding's vocabulary: a LABEL, not a value
export type Vector = number[]; // length = d_model
export type Logits = number[]; // length = |V|, one score per vocabulary entry

/**
 * One token, with everything you need to render or highlight it (Chapter 02 §02.5).
 * `bytes` is the UTF-8 length of the token; `partial` is true when the token ends in
 * the middle of a character (byte-level BPE does that to emoji and rare scripts).
 */
export type TokenPiece = {
  index: number;
  id: TokenId;
  token: TokenStr;
  bytes: number;
  start: number;
  end: number;
  special: boolean;
  partial: boolean;
};

/**
 * What a real tokenizer returns (Chapter 02 §02.5-§02.9).
 *
 * `encoding` and `exact` are not decoration: an id means nothing without the
 * vocabulary it came from, and `exact: false` means "this tokenizer is not the
 * model's own, so treat the count as an estimate" (§05.4).
 */
export type Encoded = {
  text: RawText; // the exact text that was encoded
  encoding: string; // e.g. "o200k_base"
  exact: boolean; // true when that encoding really belongs to the model asked about
  tokens: TokenStr[]; // the pieces the model actually sees
  ids: TokenId[]; // indices into that encoding's vocabulary
  count: number; // ids.length - the number you pay for
  offsets: [number, number][]; // [start, end) character span in `text`
  specialTokensMask: boolean[]; // true where a token came from the chat template, not the user
  pieces: TokenPiece[]; // the same data, plus byte lengths and partial flags
  roundTrip: RawText; // decode(ids)
  roundTripMatches: boolean; // invariant 1 of §02.8, checked on every call
};


/** One model's limits and prices (Chapter 05). */
export type ModelSpec = {
  id: string;
  contextWindow: number;
  maxOutputTokens: number;
  pricePerMillionInput: number;
  pricePerMillionOutput: number;
};

/** One piece of a prompt, with the token count it costs (Chapters 05 and 08). */
export type PromptPart = {
  name: "system" | "tools" | "user" | "context" | "history";
  tokens: number;
};

/** The four granularities compared in Chapter 03. */
export type Granularity = "word" | "char" | "subword";

/** An ordered merge list is the tokenizer for BPE (Chapter 04 §04.10). */
export type Merge = [string, string];
