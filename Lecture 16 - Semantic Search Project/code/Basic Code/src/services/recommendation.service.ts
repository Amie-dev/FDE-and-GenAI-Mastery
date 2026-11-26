/**
 * RecommendationService — the COMPARE + RANK steps of the pipeline.
 *
 * Lecture 13 notes (Chapter 05, Chapter 06):
 *   COMPARE → measure closeness between vectors (cosine similarity)
 *   RANK    → sort by score, return top N results
 *
 * It handles the two features the notes describe as one shared
 * infrastructure (Chapter 07 / Chapter 04):
 *
 *  1. SEMANTIC SEARCH — user types a description; we embed it and rank
 *     every stored movie by similarity to that query vector.
 *
 *  2. SIMILAR MOVIE RECOMMENDATION — a movie already has a vector, so we
 *     compare that vector against every *other* movie's vector and rank
 *     the rest (excluding the source movie itself).
 *
 * The only math used is cosine similarity:
 *     cosine(A, B) = (A · B) / (|A| × |B|)
 *
 * - dot product A·B = sum of element-wise products
 * - |A| = L2 magnitude (length) of A
 * - cosine range: -1 (opposite) to 1 (identical direction)
 *
 * Cosine is used because, as the notes explain (Chapter 05), it ignores
 * vector magnitude and measures *semantic direction* — exactly what text
 * embeddings encode.
 */

import { Movie, ScoredMovie } from "../types/movie.types.js";
import { VectorStoreService } from "./vector.store.service.js";

export class RecommendationService {
  constructor(private readonly store: VectorStoreService) {}

  /**
   * Cosine similarity between two vectors.
   *
   * Both vectors are assumed already normalised (unit length).  When that
   * is true, the denominator |A|×|B| equals 1, so the formula becomes a
   * plain dot product — cheaper to compute and exactly what a real
   * vector store does under the hood.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(
        `Vector length mismatch: ${a.length} vs ${b.length}. ` +
          "All vectors in the store must share the same dimension.",
      );
    }

    // Dot product — step 1 of the similarity formula.
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }

    // With unit-norm vectors the denominator collapses to 1.
    return dot;
  }

  /**
   * SEMANTIC SEARCH.
   *
   * 1. Embed the user's query.
   * 2. Compare the query vector against every stored movie vector.
   * 3. Sort by similarity (descending).
   * 4. Return the top N movies.
   *
   * This is the exact ranking pipeline from Chapter 05 / 06 of the notes.
   */
  search(query: string, topN: number = 5): ScoredMovie[] {
    const queryVector = this.store.getEmbeddingService()
      .embedText(query);

    const scored = this.store
      .getAll()
      .map((movie) => ({
        movie,
        score: this.cosineSimilarity(queryVector, movie.vector ?? []),
      }))
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, topN);
  }

  /**
   * SIMILAR MOVIE RECOMMENDATION.
   *
   * Reuses the same COMPARE + RANK machinery as search, but the "source"
   * vector comes from an existing movie (already stored), so we skip the
   * REPRESENT step for it.  That is the precomputation dividend from
   * Chapter 03: the source movie's vector was computed once, so every
   * "show similar movies" click is just a fast dot product.
   */
  similarTo(movieId: string, topN: number = 5): ScoredMovie[] {
    const source = this.store.getMovie(movieId);
    if (!source) {
      return [];
    }

    const sourceVector = source.vector ?? [];
    if (sourceVector.length === 0) {
      return [];
    }

    // Build a tiny score list, then sort and take the top N.
    const scored = this.store
      .getAll()
      .filter((m) => m.id !== movieId)
      .map((movie) => ({
        movie,
        score: this.cosineSimilarity(sourceVector, movie.vector ?? []),
      }))
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, topN);
  }
}

export {};