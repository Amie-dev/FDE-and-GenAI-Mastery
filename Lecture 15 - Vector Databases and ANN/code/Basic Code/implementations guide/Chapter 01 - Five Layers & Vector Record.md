# Chapter 01 — Five Layers & Vector Record

This chapter implements the **five layers** from Chapter 01 of the notes:

1. **Layer 1 — Original data**: `payload` (metadata) attached to each vector
2. **Layer 2 — Vector representation**: the `vector` number array
3. **Layer 3 — Similarity function**: cosine similarity
4. **Layer 4 — ANN index**: brute-force linear scan (exact KNN, the baseline)
5. **Layer 5 — Metadata / payload**: filtering search results by metadata

---

## 01.1 File: `src/types/index.ts`

Full code:

```ts
/**
 * Chapter 01 — Five Layers: Record model
 * A vector record = id + vector + payload (metadata)
 */
export interface VectorRecord {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

/**
 * Search result returned by similarity search
 */
export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

/**
 * Filter applied during search (metadata filter — Chapter 01 Layer 5)
 */
export interface VectorFilter {
  [key: string]: unknown;
}
```

### Block-by-Block Explanation

**`VectorRecord`** — Represents one stored item. It has three parts, matching the five layers:
- `id` — unique identifier (Layer 1: provenance / original data reference)
- `vector` — the embedding numbers (Layer 2: vector representation)
- `payload` — metadata object like `{ tenant: "company-a", category: "docs" }` (Layer 1 original data + Layer 5 metadata)

**`SearchResult`** — What gets returned to the caller after search:
- `id` — which record matched
- `score` — cosine similarity score (higher = more similar, Layer 3)
- `payload` — the record's metadata so the client can display or cite it (Layer 1)

**`VectorFilter`** — A dictionary of key/value pairs used to narrow search results.
Example: `{ tenant: "company-a" }` returns only vectors belonging to that tenant (Layer 5: filtering).

---

## 01.2 File: `src/config/config.ts`

Full code:

```ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
```

### Block-by-Block Explanation

- `dotenv.config()` loads variables from `.env` into `process.env`.
- `config.port` — the HTTP port the Express server listens on (defaults to `3000`).
- `config.nodeEnv` — runtime environment (`development` / `production`), defaults to `development`.
- This is the single place where runtime configuration is read. The rest of the app imports `config` instead of reading `process.env` directly.

**Next part follows — see `01.3` for `src/services/vectorService.ts`**

## 01.3 File: `src/services/vectorService.ts`

Full code:

```ts
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
```

### Block-by-Block Explanation

**`cosineSimilarity(a, b)`** — Implements Layer 3 (similarity function).
- Computes the dot product of two vectors and divides by the product of their magnitudes.
- Returns a value between -1 and 1. `1` means identical direction, `0` means orthogonal, `-1` means opposite.
- This is the similarity metric used to rank search results.

**`matchesFilter(record, filter)`** — Implements Layer 5 (metadata filtering).
- Checks that every key/value pair in `filter` exists and matches in `record.payload`.
- Example: if `filter = { tenant: "company-a" }`, only records whose `payload.tenant === "company-a"` pass.

**`VectorService` class** — The core engine (Chapters 01 + 05).
- `private vectors: VectorRecord[]` — in-memory storage. In production this would be a database (pgvector, Qdrant, Milvus — Chapter 05).
- `add(record)` — write path. Appends the record to the array. O(1).
- `search(query, k, filter)` — read path. Implements all five layers:
  1. Filter candidates by payload (Layer 5)
  2. Compute cosine similarity for each (Layer 3)
  3. Sort by score (Layer 3 ranking)
  4. Return top-k (Layer 4 ANN index — brute-force here, exact KNN)
- `count()` — returns total stored vectors (useful for monitoring, Chapter 05).

---