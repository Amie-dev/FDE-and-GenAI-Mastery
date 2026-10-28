# Chapter 05 — Routes (`src/routes/index.ts`)

## File details
- **Path:** `code/Basic Code/src/routes/index.ts`
- **Purpose:** Wire URL paths to controller functions using an Express `Router`.
- **Command:** none

## Full code file

```ts
/**
 * Lecture 14 — Basic routes.
 * Wires endpoints to controllers.
 */

import { Router } from 'express';
import { storeVector, search } from '../controllers/vectorController';

const router = Router();

/** Store a vector record: ID + embedding + metadata. */
router.post('/vectors', storeVector);

/** Brute-force KNN search: return top K most similar stored vectors. */
router.get('/search', search);

export default router;
```

## Block-by-block explanation

**Block 1 — imports + router**
Imports Express `Router` and the two controller functions. `const router = Router()` creates a mini-application that holds route definitions.

**Block 2 — `router.post('/vectors', storeVector)`**
`POST /vectors` is handled by `storeVector`. Body: `{ id, embedding, metadata }`. This is the write endpoint.

**Block 3 — `router.get('/search', search)`**
`GET /search` is handled by `search`. Query string: `?vector=0.1,0.2&k=5`. This is the read/search endpoint.

**Block 4 — `export default router`**
Exports the router so the entry point (`src/index.ts`) can mount it. Keeping routes separate from the app keeps each file small and single-purpose.

---
