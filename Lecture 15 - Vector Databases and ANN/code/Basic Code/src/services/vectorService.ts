import { VectorRecord, SearchResult, VectorFilter } from '../types';

/**
 * Chapter 01 — Layer 2 & 3: Vector representation + similarity function
 * Cosine similarity: dot product divided by magnitudes.
 * Range: -1 (opposite) to 1 (identical). 1 = most similar.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * Chapter 01 — Layer 5: Metadata / payload filter
 * Returns true if record matches all filter key/value pairs.
 */
function matchesFilter(record: VectorRecord, filter: VectorFilter): boolean {
  return Object.entries(filter).every(([key, value]) => {
    return record.payload[key] === value;
  });
}

/**
 * Chapter 01 — Five Layers + Chapter 05 — Basic engine operations
 * In-memory vector store.
 *
 * Layers implemented:
 *   Layer 1 — Original data: payload (metadata)
 *   Layer 2 — Vector representation: the embedding array
 *   Layer 3 — Similarity function: cosine similarity
 *   Layer 4 — ANN index: brute-force linear scan (basic, exact KNN)
 *   Layer 5 — Metadata / payload: filtering by payload fields
 *
 * Methods:
 *   add(record)        — store a vector record (write path)
 *   search(query, k, filter) — cosine search over all vectors, apply filter, return top-k
 */
export class VectorService {
  private vectors: VectorRecord[] = [];

  /**
   * Store a single vector record.
   * This is the write path: validate → persist → acknowledge.
   */
  add(record: VectorRecord): void {
    this.vectors.push(record);
  }

  /**
   * Search for the k most similar vectors to the query vector.
   *
   * Steps (read path from Chapter 01):
   *   1. Embed query (already done by caller — query vector passed in)
   *   2. Filter by metadata (if filter provided) — Layer 5
   *   3. Compute cosine similarity for every candidate — Layer 3
   *   4. Sort by score descending
   *   5. Return top-k results with id, score, payload
   */
  search(query: number[], k: number, filter?: VectorFilter): SearchResult[] {
    // Step 2 — filter candidates by metadata
    const candidates = filter
      ? this.vectors.filter((v) => matchesFilter(v, filter))
      : this.vectors;

    // Step 3 — compute similarity for each candidate
    const scored: SearchResult[] = candidates.map((record) => ({
      id: record.id,
      score: cosineSimilarity(query, record.vector),
      payload: record.payload,
    }));

    // Step 4 — sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Step 5 — return top-k
    return scored.slice(0, k);
  }

  /**
   * Return the total number of stored vectors.
   */
  count(): number {
    return this.vectors.length;
  }
}