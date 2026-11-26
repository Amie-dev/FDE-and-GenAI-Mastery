/**
 * Lecture 14 — Basic vector store service.
 *
 * Implements the two ideas from the notes:
 *  1. Store records as ID + vector + metadata (Chapter 03).
 *  2. Brute-force KNN search with cosine similarity — the correct baseline
 *     that every ANN index is measured against (Chapter 04).
 *
 * Algorithm:
 *   score every stored vector against the query,
 *   sort by score descending,
 *   return top K.
 * Cost: O(N × D) per query, 100% recall.
 */

import type { VectorRecord, SearchResult } from '../types';

const vectors: VectorRecord[] = [];

/** Cosine similarity between two vectors: (A · B) / (|A| × |B|). */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Store (or overwrite) a vector record. ID is the upsert key. */
export function addVector(record: VectorRecord): void {
  const existing = vectors.findIndex((v) => v.id === record.id);
  if (existing >= 0) {
    vectors[existing] = record;
  } else {
    vectors.push(record);
  }
}

/** Brute-force KNN: return the K stored vectors closest to `query`. */
export function searchVectors(query: number[], k: number): SearchResult[] {
  const scored: SearchResult[] = vectors.map((record) => ({
    id: record.id,
    score: cosineSimilarity(query, record.embedding),
    metadata: record.metadata,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export function vectorCount(): number {
  return vectors.length;
}