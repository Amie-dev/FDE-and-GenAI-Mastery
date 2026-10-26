/**
 * The lecture's vocabulary, written as types (notes ch02 §02.3, ch03 §03.1).
 * Read them together: each one is the output of one step and the input of the
 * next, which is why the names must never be mixed up.
 */

export type Vector = number[]; // one row of numbers - d_model or d_k of them
export type Matrix = number[][]; // rows x cols, e.g. N x d_model for a whole sequence
export type AttentionWeights = Matrix; // N x N, and every ROW sums to 1 (notes ch01 §01.7)
export type Token = string; // a token as text, e.g. "mat"

/**
 * Which positions a token is allowed to read (notes ch03 §03.5, ch09 §09.6).
 *   none    - everyone sees everyone (encoder)
 *   causal  - position i sees only j <= i (decoder: no peeking at the future)
 *   sliding - causal, plus a window of the last `window` positions
 *   padding - causal, plus a ban on the pad tokens at the end
 */
export type MaskKind = "none" | "causal" | "sliding" | "padding";

/** The three architecture families of notes ch06 §06.1. */
export type Architecture = "encoder-decoder" | "encoder-only" | "decoder-only";

/** The three attention modes of notes ch06 §06.3. */
export type AttentionMode = "bidirectional" | "causal" | "cross";

/** The four positional schemes of notes ch09 §09.3. */
export type PositionalScheme = "sinusoidal" | "rope" | "alibi" | "learned";

/** How one token gets picked out of the distribution (notes ch08 §08.1). */
export type DecodingStrategy = "greedy" | "beam" | "sample";

/** The shape of one model, and where its parameters live (notes ch05 §05.4). */
export type ModelShape = {
  id: string;
  dModel: number; // width of every token vector
  nHeads: number; // h - parallel attention heads
  dFF: number; // the FFN's hidden width
  layers: number; // how many transformer blocks
  contextWindow: number; // the longest sequence the model accepts
};

/** One vocabulary entry, with the score the model gave it (notes ch07 §07.3). */
export type Candidate = {
  id: number;
  token: Token;
  logit: number; // raw, unnormalised score - NOT a probability
  probability?: number; // filled in after the softmax
  percent?: number; // probability as a percentage, rounded for reading
};

/** Everything the decode step needs (notes ch08 §08.10). */
export type DecodingSettings = {
  strategy: DecodingStrategy;
  temperature: number; // divides the logits; T = 0 means greedy
  topK: number | null; // keep the k most likely tokens
  topP: number | null; // keep the smallest set that reaches this probability mass
  minP: number | null; // keep tokens at least this fraction of the leader
  repetitionPenalty: number; // 1 = off; > 1 discourages repeats
  frequencyPenalty: number; // subtract, proportional to how often a token appeared
  presencePenalty: number; // subtract a flat amount if a token appeared at all
  seed: number; // so the same request gives the same draw (notes ch08 §08.11)
};
