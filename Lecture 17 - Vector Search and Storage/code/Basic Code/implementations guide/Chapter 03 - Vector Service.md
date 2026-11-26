# Chapter 03 — Vector Service (`src/services/vectorService.ts`)

## File details
- **Path:** `code/Basic Code/src/services/vectorService.ts`
- **Purpose:** The heart of the lecture. Stores vectors in memory and answers brute-force KNN queries with cosine similarity. This is the "correct baseline" from Chapter 04 of the notes.
- **Command:** none

## Full code file

```ts
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
```

## Block-by-block explanation

**Block 1 — imports + in-memory store**
`import type {...}` brings in the interfaces (types only, erased at compile time). `const vectors: VectorRecord[] = []` holds every stored record in a plain array — this is the "table of vectors" from the notes. No database, no file, no network: just memory, which keeps this example runnable and easy to read.

**Block 2 — `cosineSimilarity(a, b)`**
Implements `cos(A, B) = (A · B) / (‖A‖ × ‖B‖)`:
- Loops once over both vectors accumulating the dot product and the two squared norms.
- If either vector is zero-length, returns `0` (avoids division by zero).
- Otherwise returns `dot / (sqrt(normA) × sqrt(normB))`, a value in [−1, +1]; +1 means same direction.

This is the similarity function used to rank stored vectors against the query.

**Block 3 — `addVector(record)`**
Upsert logic:
- Looks for an existing record with the same `id` via `findIndex`.
- If found, overwrites it (`vectors[existing] = record`) — deterministic IDs make re-ingestion idempotent, as the notes recommend.
- Otherwise `push`es a new record.

**Block 4 — `searchVectors(query, k)` — the brute-force KNN algorithm**
This is the entire algorithm from the notes (**score → sort → slice**):
1. `vectors.map(...)` — for every stored vector, compute `cosineSimilarity(query, record.embedding)` and build a `SearchResult`.
2. `scored.sort((a, b) => b.score - a.score)` — descending by score so the most similar comes first.
3. `scored.slice(0, k)` — keep only the top K.

Cost: O(N × D) per query — every stored vector is compared. That is exactly why the notes call brute force the "correct baseline": fine for a toy (30 vectors), too slow at 100 million.

**Block 5 — `vectorCount()`**
Returns how many vectors are stored. Used by the controller to report `totalStored` in the response.

---
