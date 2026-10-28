# Chapter 04 — Controller (`src/controllers/vectorController.ts`)

## File details
- **Path:** `code/Basic Code/src/controllers/vectorController.ts`
- **Purpose:** Turns HTTP requests into service calls and service results into JSON responses. Two endpoints: store a vector, and search vectors.
- **Command:** none

## Full code file

```ts
/**
 * Lecture 14 — Basic controllers.
 * HTTP handlers for storing vectors and searching them.
 */

import type { Request, Response } from 'express';
import type { VectorRecord, SearchResult } from '../types';
import { addVector, searchVectors, vectorCount } from '../services/vectorService';

/** POST /vectors — store a vector record. */
export function storeVector(req: Request, res: Response): void {
  const { id, embedding, metadata } = req.body as VectorRecord;

  if (!id || !Array.isArray(embedding) || embedding.length === 0) {
    res.status(400).json({ error: 'id and embedding (non-empty number[]) are required' });
    return;
  }

  addVector({ id, embedding, metadata });
  res.status(201).json({ message: 'vector stored', id });
}

/** GET /search?vector=0.1,0.2&k=5 — brute-force top-K search. */
export function search(req: Request, res: Response): void {
  const vectorParam = req.query.vector;

  if (typeof vectorParam !== 'string') {
    res.status(400).json({ error: 'query param "vector" (comma-separated numbers) is required' });
    return;
  }

  const query = vectorParam.split(',').map(Number);
  const k = req.query.k ? Number(req.query.k) : 5;

  if (query.some((v) => Number.isNaN(v))) {
    res.status(400).json({ error: 'vector must contain only numbers' });
    return;
  }

  const results: SearchResult[] = searchVectors(query, k);
  res.json({
    count: results.length,
    totalStored: vectorCount(),
    results,
  });
}
```

## Block-by-block explanation

**Block 1 — imports**
`Request`/`Response` types from Express for handler signatures. The record and result types from `types/`. The three service functions from `services/`.

**Block 2 — `storeVector(req, res)` — POST /vectors**
1. Destructures `id`, `embedding`, `metadata` from the JSON body.
2. Guards: `id` must be truthy and `embedding` must be a non-empty array; otherwise respond `400` and `return` early.
3. Calls `addVector(...)` to store (or overwrite) the record.
4. Responds `201` with `{ message, id }`.

This is the write path: ID + vector + metadata goes into the store.

**Block 3 — `search(req, res)` — GET /search**
1. Reads `req.query.vector`. Express parses a single `?vector=0.1,0.2` as a string; if missing or an array, respond `400`.
2. Splits on commas and maps to `Number`, producing the query vector.
3. Reads optional `k` (default `5`).
4. Guards: if any entry is `NaN`, respond `400`.
5. Calls `searchVectors(query, k)` (the brute-force KNN from the service).
6. Responds JSON with `count`, `totalStored`, and `results` (each result carries `id`, `score`, `metadata`).

This is the read path: embed query → compare with ALL stored vectors → sort → return top K.

---
