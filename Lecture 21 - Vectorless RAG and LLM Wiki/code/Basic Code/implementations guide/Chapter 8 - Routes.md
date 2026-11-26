# Chapter 8 — Routes

> File: `src/routes/index.ts`
>
> Purpose: Defines all API routes and wires them to the appropriate controller handlers. This is the single place where URL paths are mapped to controller functions.

## Full Code File

```typescript
import { Router } from 'express';
import { buildTree, searchTree } from '../controllers/treeController';
import { ingest, getCatalog, searchWiki } from '../controllers/wikiController';

const router = Router();

// --- Vectorless RAG & Agentic Tree Search routes ---
router.post('/tree/build', buildTree);
router.post('/tree/search', searchTree);

// --- LLM Wiki & Two-Pass Retrieval routes ---
router.post('/wiki/ingest', ingest);
router.get('/wiki/catalog', getCatalog);
router.post('/wiki/search', searchWiki);

export default router;
```

## Command (if needed)

None — uses only Express `Router`.

## Block-by-Block Explanation

### Block 1 — Imports and router creation
```typescript
import { Router } from 'express';
import { buildTree, searchTree } from '../controllers/treeController';
import { ingest, getCatalog, searchWiki } from '../controllers/wikiController';

const router = Router();
```
**What this does:** Imports Express `Router` and all controller handler functions, then creates a new router instance.

**How it works:** `Router()` creates a modular, mountable route handler that can be used as middleware in the main Express app.

### Block 2 — Vectorless RAG & Agentic Tree Search routes
```typescript
router.post('/tree/build', buildTree);
router.post('/tree/search', searchTree);
```
**What this does:** Registers two POST routes for tree operations.

**How it works:**
- `POST /api/tree/build` → `buildTree` controller → builds hierarchical tree index (Chapter 02 feature)
- `POST /api/tree/search` → `searchTree` controller → agentic tree navigation (Chapter 03 feature)

### Block 3 — LLM Wiki & Two-Pass Retrieval routes
```typescript
router.post('/wiki/ingest', ingest);
router.get('/wiki/catalog', getCatalog);
router.post('/wiki/search', searchWiki);
```
**What this does:** Registers three routes for wiki operations.

**How it works:**
- `POST /api/wiki/ingest` → `ingest` controller → ingests file into wiki vault (Chapter 04 feature)
- `GET /api/wiki/catalog` → `getCatalog` controller → lists lightweight metadata (Chapter 05 Pass 1)
- `POST /api/wiki/search` → `searchWiki` controller → two-pass retrieval search (Chapter 05 feature)

### Block 4 — Export router
```typescript
export default router;
```
**What this does:** Exports the configured router so it can be mounted in the main Express app (`src/app.ts`).

**How it works:** The router is mounted at `/api` in `app.ts` via `app.use('/api', router)`, making all routes available under the `/api` prefix.

