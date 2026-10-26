/**
 * Chapter 02 (§02.9) - the five stages of the pipeline, written as types.
 * Read them together: each one is the output of one stage and the input of the
 * next, which is why the names must never be mixed up.
 */
export type RawText = string; // exactly what the user sent, after Unicode normalisation
export type TokenStr = string; // a text fragment, e.g. "▁love" - the marker means "space"
export type TokenId = number; // an index into the vocabulary: a LABEL, not a value
export type Vector = number[]; // length = d_model
export type Logits = number[]; // length = |V|, one score per vocabulary entry

/** What a tokenizer returns (Chapter 03 §03.10). */
export type Encoded = {
  tokens: TokenStr[]; // the pieces the model actually sees
  ids: TokenId[]; // indices into the vocabulary
  offsets: [number, number][]; // [start, end) character span in the ORIGINAL text
  specialTokensMask: boolean[]; // true where a token came from the chat template, not the user
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
