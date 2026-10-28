# Chapter 05 — Vector Database Engine Decisions & Production Operations

This chapter explains **engine selection and production operations** from Chapter 05 of the notes, and shows how the basic code maps to a real Express-based vector search API.

## 05.1 Engine Comparison (from the Notes)

| Engine | Origin | Design Focus | Best For |
|--------|--------|--------------|----------|
| pgvector | PostgreSQL extension | SQL-native, simplicity | Prototype, <10M vectors, existing Postgres |
| Qdrant | Rust research lab | Performance, filtering | Growth stage, strong filtering + PQ |
| Milvus | Distributed DB | Billion-scale, distributed | Scale stage, sharding, replication |
| FAISS | Meta research | Library, not a server | Research, full control |
| Chroma | Open-source embedded DB | Dev/test simplicity | Local development |

## 05.2 How the Basic Code Maps to Engine Decisions

The basic code in `src/services/vectorService.ts` is an **in-memory brute-force vector store** — equivalent to the simplest possible engine (like Chroma or Flat index).

| Basic Code Component | Production Equivalent |
|----------------------|----------------------|
| `VectorService.vectors` (array) | pgvector table, Qdrant segments, Milvus collection |
| `cosineSimilarity()` | `<=>` cosine operator (pgvector), HNSW distance (Qdrant) |
| `matchesFilter()` | Payload index / SQL WHERE clause |
| `search()` top-k | `ORDER BY ... LIMIT k` with ANN index |
| `add(record)` | SQL INSERT / Qdrant upsert |

**When to upgrade** (from Chapter 05 decision tables):
- Prototype: pgvector or in-memory (basic code) — SQL-native, no infra
- Growth: Qdrant — filtering, segments, PQ
- Scale: Milvus — distributed, billion-scale

## 05.3 File: `src/routes/index.ts` (Express API Layer)

Full code:

```ts
import { Router } from 'express';
import { VectorController } from '../controllers/vectorController';
import { VectorService } from '../services/vectorService';

/**
 * Chapter 05 — Route definitions for the vector search API.
 * One route per operation: store, search, count.
 */
const router = Router();
const service = new VectorService();
const controller = new VectorController(service);

router.post('/vectors', controller.addVector);
router.post('/search', controller.searchVectors);
router.get('/vectors/count', controller.getCount);

export default router;
```

### Block-by-Block Explanation

- `Router()` creates an Express router instance.
- `VectorService` and `VectorController` are instantiated once and shared (dependency injection, simple form).
- `POST /vectors` — stores a vector record (write path).
- `POST /search` — runs similarity search with optional filter (read path).
- `GET /vectors/count` — returns total stored vector count (ops monitoring).
- `export default router` — the router is mounted in `src/index.ts` under `/api`.

**Next part — see `05.4` for `src/controllers/vectorController.ts`**

## 05.4 File: `src/controllers/vectorController.ts` (HTTP Handlers)

Full code:

```ts
import { Request, Response } from 'express';
import { VectorService } from '../services/vectorService';
import { VectorRecord, SearchResult, VectorFilter } from '../types';

/**
 * Chapter 05 — Basic engine operations exposed as HTTP API.
 * Each handler is thin: parse request → call service → send response.
 */
export class VectorController {
  constructor(private readonly service: VectorService) {}

  /**
   * POST /vectors
   * Body: { id, vector: number[], payload: {...} }
   * Stores a vector record (Chapter 01 — write path).
   */
  addVector = (req: Request, res: Response): void => {
    const record: VectorRecord = req.body;
    if (!record.id || !record.vector) {
      res.status(400).json({ error: 'id and vector are required' });
      return;
    }
    this.service.add(record);
    res.status(201).json({ message: 'vector stored', id: record.id });
  };

  /**
   * POST /search
   * Body: { vector: number[], k?: number, filter?: {...} }
   * Returns top-k similar vectors (Chapter 01 — read path).
   */
  searchVectors = (req: Request, res: Response): void => {
    const { vector, k = 5, filter }: { vector: number[]; k?: number; filter?: VectorFilter } =
      req.body;

    if (!vector) {
      res.status(400).json({ error: 'query vector is required' });
      return;
    }

    const results: SearchResult[] = this.service.search(vector, k, filter);
    res.json({ count: results.length, results });
  };

  /**
   * GET /vectors/count
   * Returns how many vectors are stored.
   */
  getCount = (_req: Request, res: Response): void => {
    res.json({ count: this.service.count() });
  };
}
```

### Block-by-Block Explanation

**`VectorController` class** — Thin Express handlers. No business logic — only request parsing and response formatting.

**`addVector`** — `POST /vectors`:
- Reads `{ id, vector, payload }` from `req.body`
- Validates that `id` and `vector` are present
- Delegates to `service.add(record)` (the write path)
- Returns `201 Created` with the stored id

**`searchVectors`** — `POST /search`:
- Reads `{ vector, k, filter }` from `req.body`
- Defaults `k` to 5 results
- Validates that `vector` is present
- Delegates to `service.search(vector, k, filter)` (the read path)
- Returns `{ count, results }` where each result has `id`, `score`, `payload`

**`getCount`** — `GET /vectors/count`:
- Returns `service.count()` — useful for operational monitoring (Chapter 05)

**Next part — see `05.5` for `src/index.ts`**

## 05.5 File: `src/index.ts` (Express Server Entry Point)

Full code:

```ts
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import { config } from './config/config';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.listen(config.port, () => {
  console.log(`Vector search API running on http://localhost:${config.port}`);
});

export default app;
```

### Block-by-Block Explanation

- `dotenv.config()` loads `.env` variables.
- `express()` creates the Express application.
- `app.use(cors())` enables cross-origin requests (allows frontend clients to call the API).
- `app.use(express.json())` parses JSON request bodies.
- `app.use('/api', routes)` mounts all routes under the `/api` prefix (so full paths are `/api/vectors`, `/api/search`, `/api/vectors/count`).
- `app.listen(config.port, ...)` starts the HTTP server on the configured port.
- `export default app` allows the app to be imported in tests.

## 05.6 Example Requests

Start the server: `npm run dev` (or `npm start` after `npm run build`)

**Store a vector:**
```bash
curl -X POST http://localhost:3000/api/vectors \
  -H "Content-Type: application/json" \
  -d '{"id":"doc-1","vector":[0.1,0.2,0.3,0.4],"payload":{"tenant":"company-a","category":"docs"}}'
```

**Search for similar vectors:**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"vector":[0.1,0.2,0.3,0.4],"k":3,"filter":{"tenant":"company-a"}}'
```

**Get vector count:**
```bash
curl http://localhost:3000/api/vectors/count
```

---

**End of implementation guide.** All chapters (00 → 05) cover the basic code in `code/Basic Code/` and explain how each maps to the concepts in the Lecture 15 notes.

**Next part — see `05.3` for `src/routes/index.ts`**