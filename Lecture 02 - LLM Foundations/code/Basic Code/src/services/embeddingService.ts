import { config } from "../config/config";
import type { TokenId, Vector } from "../types";

/**
 * Chapter 06 - the embedding table: W_emb is |V| rows by d_model columns, and
 * the lookup is a table read: E_t = W_emb[id(t)] (§06.1).
 *
 * A real table is LEARNED by gradient descent during pre-training (§06.6). This
 * one is filled from a seeded generator, so the numbers are stable across runs
 * and you can watch the mechanism - a table read, then geometry - without a GPU.
 * The mechanism is real; the MEANING is not: these vectors are random, so their
 * similarity is not semantic. Chapter 06 §06.10 explains what a real embedding
 * model adds.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Row `id` of W_emb. A real table is |V| rows by d_model columns - 199,998 x 4096 for
 * o200k_base - and it is LEARNED during pre-training (§06.6). This one is GENERATED
 * from the id instead of stored: same id, same row, on every run, and no 200k-row array
 * sitting in memory. The mechanism is real (a table read, then geometry); the meaning is
 * not, because nothing here was learned.
 */
export function vectorForId(id: TokenId): Vector {
  const random = mulberry32(id * 2654435761); // same id -> same row, every run
  return Array.from({ length: config.dModel }, () => Number((random() * 2 - 1).toFixed(4)));
}

export const EMBEDDING_DIMS = config.dModel;

/** The lookup. No arithmetic is ever done on the id itself (§06.1). */
export function embed(id: TokenId): Vector {
  return vectorForId(id);
}

export function embedAll(ids: TokenId[]): Vector[] {
  return ids.map(embed);
}

export const dot = (a: Vector, b: Vector): number => a.reduce((sum, value, i) => sum + value * b[i], 0);

export const magnitude = (vector: Vector): number => Math.sqrt(dot(vector, vector));

/** Unit length. Once normalised, cosine similarity IS the dot product (§06.4). */
export function normalize(vector: Vector): Vector {
  const length = magnitude(vector);
  return length === 0 ? vector : vector.map((value) => value / length);
}

/** 1 = same direction, 0 = unrelated, -1 = opposite (§06.4). */
export function cosine(a: Vector, b: Vector): number {
  const denominator = magnitude(a) * magnitude(b);
  return denominator === 0 ? 0 : dot(a, b) / denominator;
}

export function euclidean(a: Vector, b: Vector): number {
  return Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0));
}

export type Metric = "cosine" | "dot" | "euclidean";

export function similarity(a: Vector, b: Vector, metric: Metric): number {
  if (metric === "dot") return dot(a, b);
  if (metric === "euclidean") return euclidean(a, b);
  return cosine(a, b);
}

/**
 * A stand-in "text embedding": the mean of the token vectors.
 * Useful to see how a passage becomes one vector, but §06.10 is explicit - a real
 * retrieval embedding comes from a dedicated encoder, and its model id must be
 * stored with the vector so two spaces are never mixed.
 */
export function meanPool(ids: TokenId[]): Vector {
  if (ids.length === 0) return new Array(config.dModel).fill(0);
  const vectors = embedAll(ids);
  const summed = vectors.reduce<Vector>((acc, vector) => acc.map((value, i) => value + vector[i]), new Array(config.dModel).fill(0));
  return summed.map((value) => Number((value / vectors.length).toFixed(4)));
}

/** Trim a vector for display: full vectors are long and unreadable in a terminal. */
export function preview(vector: Vector, size = 4): Vector {
  return vector.slice(0, size);
}
