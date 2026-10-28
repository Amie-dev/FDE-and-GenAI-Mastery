# Chapter 02 — Open-Book Architecture: Routes

**Notes source:** `Lecture 16 - RAG/notes/02_open_book_architecture_two_pipelines.md`

**Goal:** Wire up the two pipelines as HTTP routes — ingestion (offline) and query (online). This is the "two pipelines" diagram made concrete in Express.

---

## `src/router/index.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/router/index.ts` |
| Chapter | 02 |
| What it does | Creates an Express `Router` and mounts two endpoints: `POST /api/ingest` (offline pipeline) and `POST /api/query` (online pipeline), plus a `GET /api/health` check. |

### Full code

```ts
import { Router } from "express";
import * as rag from "../controllers/rag.controller";

/**
 * Router — mounts the two RAG endpoints.
 *
 * POST /api/ingest   offline ingestion (Chapter 03)
 * POST /api/query    online grounded Q&A (Chapters 02, 06, 07)
 * GET  /api/health   liveness check
 */

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.post("/ingest", rag.ingest);
router.post("/query", rag.query);

export default router;
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `import { Router } from "express"` | Imports Express's router factory. |
| `import * as rag from "../controllers/rag.controller"` | Imports the controller as a namespace. The router knows about routes; the controller knows about logic. |
| `const router = Router()` | Creates a new Express router instance. |
| `router.get("/health", ...)` | A simple liveness endpoint. Returns `{ status: "ok" }`. Useful for load balancers and "is the server up?" checks. |
| `router.post("/ingest", rag.ingest)` | Mounts the offline pipeline. Body: `{ docId, title, text, tenantId }`. Calls `ingestDocument` → chunks → embeds → upserts. |
| `router.post("/query", rag.query)` | Mounts the online pipeline. Body: `{ question, tenantId, sessionId, roles }`. Calls `retrieve` → `generate` → returns answer + citations. |
| `export default router` | Exports the router so `src/index.ts` can mount it at `/api`. |

### The two pipelines in this file

| Pipeline | Route | When it runs | Notes source |
|----------|-------|--------------|--------------|
| Ingestion (offline) | `POST /api/ingest` | When a document is added/changed | Chapter 02: "Document upload, schedule, webhook" |
| Serving (online) | `POST /api/query` | On every user question | Chapter 02: "Every user question" |

### Command

```bash
# The router is wired into src/index.ts. Start the server:
npm run dev
# Then test:
curl http://localhost:3000/api/health
```
