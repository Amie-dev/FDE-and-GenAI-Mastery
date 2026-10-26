import "dotenv/config";
import type { ModelShape } from "../types";

/**
 * Chapter 05 §05.4 - the shapes every endpoint measures against. Only three are
 * needed: one small enough to print, and two real models so the arithmetic can be
 * checked against something you have heard of (ch02 §02.3, ch04 §04.3).
 *
 * d_head = dModel / nHeads must be a whole number, and it is 64 or 128 in almost
 * every real model - one of the most stable hyperparameters in the field.
 */
const SHAPES: ModelShape[] = [
  { id: "toy-tiny", dModel: 8, nHeads: 2, dFF: 32, layers: 2, contextWindow: 512 },
  { id: "gpt2-small", dModel: 768, nHeads: 12, dFF: 3072, layers: 12, contextWindow: 1024 },
  { id: "llama3-8b", dModel: 4096, nHeads: 32, dFF: 14336, layers: 32, contextWindow: 8192 },
];

/** Read a number from the environment, falling back when it is missing or silly. */
function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Read a number that is allowed to be 0 (temperature 0 means greedy). */
function numOrZero(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export const config = {
  /** Port the HTTP server listens on. */
  port: num(process.env.PORT, 3000),

  /** The shape used when a request does not name one. */
  defaultShape: process.env.DEFAULT_SHAPE ?? "toy-tiny",

  /** The toy width every endpoint falls back to (ch02 §02.3). */
  dModel: num(process.env.D_MODEL, 8),

  /** h - how many heads the toy model runs (ch04 §04.3). */
  nHeads: num(process.env.N_HEADS, 2),

  /** d_ff - the FFN's hidden width, normally 4 x d_model (ch05 §05.2). */
  dFF: num(process.env.D_FF, 32),

  /** Default sequence length for the cost endpoints (ch03 §03.7). */
  nTokens: num(process.env.N_TOKENS, 6),

  /** Decoding defaults (ch08 §08.5, §08.7, §08.11). */
  temperature: numOrZero(process.env.TEMPERATURE, 1),
  topP: num(process.env.TOP_P, 0.9),
  seed: num(process.env.SEED, 42),

  /** Every shape the endpoints know about. */
  shapes: SHAPES,

  /**
   * Look a shape up by id, or fall back to the configured toy shape. A typo must
   * never crash a request: the response says which shape was actually used.
   */
  shape(id?: string): ModelShape {
    const wanted = id ?? this.defaultShape;
    return (
      SHAPES.find((shape) => shape.id === wanted) ??
      SHAPES.find((shape) => shape.id === this.defaultShape) ??
      SHAPES[0]
    );
  },

  /** d_head = d_model / h - the width of one head (ch04 §04.3). */
  dHead(shape: ModelShape): number {
    return shape.dModel / shape.nHeads;
  },
};
