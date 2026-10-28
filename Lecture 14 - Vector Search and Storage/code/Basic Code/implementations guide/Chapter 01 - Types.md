# Chapter 01 — Types (`src/types/index.ts`)

## File details
- **Path:** `code/Basic Code/src/types/index.ts`
- **Purpose:** Define the shape of a vector record and a search result. This is the record model from Chapter 03 of the notes (**ID + vector + metadata**).
- **Command:** none (pure type file — erased at compile time)

## Full code file

```ts
/**
 * Lecture 14 — Vector Search and Storage
 * Basic code: the record model mentioned in the notes.
 *
 * A vector record is the minimum viable unit of a vector database:
 *   ID + Vector + Metadata
 * (see notes/03_Anatomy_of_a_Vector_Database.md)
 */

export interface VectorRecord {
  /** Stable, deterministic identifier (maps result back to the real entity). */
  id: string;
  /** The numeric embedding used for similarity search. */
  embedding: number[];
  /** Structured attributes for filtering, display, authorization (optional). */
  metadata?: Record<string, unknown>;
}

/** Result of a KNN search: one stored vector with its similarity score. */
export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}
```

## Block-by-block explanation

**Block 1 — `export interface VectorRecord`**
Declares one stored vector with three fields:
- `id: string` — the key used to upsert (overwrite) and to return the winning vector back to the caller.
- `embedding: number[]` — the coordinates. Similarity is computed between this vector and the query vector.
- `metadata?: Record<string, unknown>` — optional structured attributes (title, genre, year, ...). The notes stress that a vector alone is not enough for a product; you need to know what the vector represents.

**Block 2 — `export interface SearchResult`**
Declares what the search returns for each neighbour:
- `id` — which stored vector matched.
- `score` — the cosine similarity (−1 … +1; higher = closer).
- `metadata` — carried along so the caller can display the result without a second lookup.

No runtime code lives in this file — it only tells TypeScript (and the reader) what the data looks like.

---
