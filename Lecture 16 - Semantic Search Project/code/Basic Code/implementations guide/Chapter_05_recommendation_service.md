# Chapter 05 — Recommendation Service (COMPARE + RANK)

The **COMPARE + RANK** steps measure how close two vectors are and return the
top-N. `RecommendationService` is the single place that does the math, and it
powers **both** features the notes call "one shared infrastructure"
(Chapter 07): semantic search and similar-movie recommendation.

The only math used is cosine similarity:

```
cosine(A, B) = (A · B) / (|A| × |B|)
```

## Files in this chapter
| File | Purpose |
|------|---------|
| `src/services/recommendation.service.ts` | `RecommendationService` — `cosineSimilarity`, `search()`, `similarTo()`. |

## Full code

### `src/services/recommendation.service.ts`

```ts
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
```

## Block-by-block

*`constructor(store: VectorStoreService)`* — the **only** dependency. The store
hands both the catalog (for COMPARE) and the `EmbeddingService` (for the
on-demand query embedding in `search`). No other wiring is needed.

*`cosineSimilarity(a, b)`* — throws on a length mismatch (`Vector length
mismatch: …`). That is the "all vectors share one dimension" invariant: every
movie vector is an 8-dim seed, and the query is embedded by the same
`EmbeddingService`, so lengths always match. With 8-dim vectors the mismatch
path is practically unreachable but defensive.

*`search(query, topN=5)`* — REPRESENT happens here: `this.store.getEmbeddingService().embedText(query)`
embeds the user's text on demand (queries are not pre-stored). Then COMPARE maps
every movie to a `ScoredMovie`, RANK sorts descending, and `slice(0, topN)` keeps
the best. The `.map(...).sort(...).slice(...)` chain is the canonical JS idiom
for "top-N by score".

*`similarTo(movieId, topN=5)`* — the source movie's vector is **already stored**
(precompute dividend), so this skips REPRESENT entirely. The `.filter((m) => m.id !== movieId)`
excludes the source movie itself from "similar" results — it must never recommend
a movie to itself.

**`export {};`** — harmless no-op (the file already has a named `export class`),
present verbatim from the source so the transcript matches the file byte-for-byte.

## Note on normalization
> `cosineSimilarity`'s own docstring says "both vectors are assumed already
> normalised". In this demo the store does **not** call `normalize()`
> (see Chapter 04), so the returned scores are technically dot products of
> raw seed vectors, not unit-vector cosines. The ranking order is unchanged, so
> the demo behaves correctly — but if you wire up a real provider, normalize
> before storing and the math becomes a true cosine.

## Tip
> `similarTo` and `search` share **all** their COMPARE + RANK logic. That is the
> "two features, one engine" payoff from the notes (Chapter 04/07): adding a
> third feature (e.g. "find movies like this description") reuses this class —
> only the *source* vector differs.
