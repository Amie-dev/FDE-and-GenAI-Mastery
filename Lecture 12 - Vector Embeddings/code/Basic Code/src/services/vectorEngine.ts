// services/vectorEngine.ts — Vector math engine (Chapter 3: measuring similarity)

import { Vector, SentenceEmbedding, Neighbor } from "../types/index.js";

/**
 * Dot product of two vectors:  Σ(aᵢ × bᵢ)
 * Captures both direction AND magnitude.
 * Used heavily in cosine similarity.
 */
export function dotProduct(a: Vector, b: Vector): number {
  if (a.values.length !== b.values.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.values.length} vs ${b.values.length}`
    );
  }
  let sum = 0;
  for (let i = 0; i < a.values.length; i++) {
    sum += a.values[i] * b.values[i];
  }
  return sum;
}

/**
 * Euclidean distance (L2):  √(Σ(xᵢ − yᵢ)²)
 * Straight-line distance. Good for well-scaled, dense features.
 */
export function euclideanDistance(a: Vector, b: Vector): number {
  if (a.values.length !== b.values.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.values.length} vs ${b.values.length}`
    );
  }
  let sum = 0;
  for (let i = 0; i < a.values.length; i++) {
    const diff = a.values[i] - b.values[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Manhattan distance (L1):  Σ|xᵢ − yᵢ|
 * City-block travel on a grid. Robust to outliers, good for sparse features.
 */
export function manhattanDistance(a: Vector, b: Vector): number {
  if (a.values.length !== b.values.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.values.length} vs ${b.values.length}`
    );
  }
  let sum = 0;
  for (let i = 0; i < a.values.length; i++) {
    sum += Math.abs(a.values[i] - b.values[i]);
  }
  return sum;
}

/**
 * Cosine similarity:  dot(a, b) / (|a| × |b|)
 * Captures direction only — magnitude-invariant. Range: -1 to 1.
 * This is the workhorse metric for text/embedding similarity.
 */
export function cosineSimilarity(a: Vector, b: Vector): number {
  if (a.values.length !== b.values.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.values.length} vs ${b.values.length}`
    );
  }
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/** Helper: length (magnitude) of a vector. */
export function magnitude(v: Vector): number {
  let sum = 0;
  for (const x of v.values) sum += x * x;
  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length (magnitude = 1).
 * After normalization, cosine similarity == dot product.
 */
export function normalize(v: Vector): Vector {
  const mag = magnitude(v);
  if (mag === 0) return { ...v, values: [...v.values] };
  return {
    dim: v.dim,
    values: v.values.map((x: number) => x / mag),
  };
}

/**
 * Find the top-N nearest neighbours of queryText among sentences.
 * Uses cosine similarity by default (recommended for embeddings).
 */
export function findNearestNeighbors(
  sentences: SentenceEmbedding[],
  queryText: string,
  topN: number,
  similarityFn: (a: Vector, b: Vector) => number = cosineSimilarity
): Neighbor[] {
  const query = sentences.find((s) => s.text === queryText);
  if (!query) throw new Error(`Query sentence not found: ${queryText}`);

  const results = sentences
    .map((s: SentenceEmbedding) => ({
      id: s.id,
      text: s.text,
      similarity: similarityFn(query.embedding, s.embedding),
      distance: euclideanDistance(query.embedding, s.embedding),
    }))
    .filter((r) => r.id !== query.id)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);

  return results;
}
