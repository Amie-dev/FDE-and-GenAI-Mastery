# Chapter 8 — Routes & Application Entry Point (Chapter 6: Integration)

## 1. File: `src/routes/index.ts`

This file defines all the API routes and mounts them under `/api`.

## 2. Full Code File

```typescript
// routes/index.ts — Mount all feature routes onto the app

import { Router, Request, Response } from "express";
import { getSentences } from "../services/embeddings.js";
import {
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  dotProduct,
  findNearestNeighbors,
} from "../services/vectorEngine.js";
import { sentenceController } from "../controllers/sentenceController.js";
import { similarityController } from "../controllers/similarityController.js";
import { neighborController } from "../controllers/neighborController.js";

const router = Router();

/** GET /health — simple health check for the service */
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: "fde-lecture-12-vector-embeddings",
    status: "ok",
  });
});

/** GET /sentences — return the full corpus of 24 embedded sentences (ch 5) */
router.get("/sentences", sentenceController.getAll);

/** GET /similarity?a=text&b=text — compute all 4 similarity measures (ch 3) */
router.get("/similarity", similarityController.getSimilarity);

/** GET /neighbors?text=&top=3 — find nearest neighbours (ch 5 build target) */
router.get("/neighbors", neighborController.getNeighbors);

/** GET /similarity/chart — build-target chart data (paraphrases cluster, word-overlap doesn't) */
router.get("/similarity/chart", (_req: Request, res: Response) => {
  const sentences = getSentences();

  const parA = sentences.find((s) => s.text.includes("fox jumps"))!;
  const parB = sentences.find((s) => s.text.includes("swift brown fox"))!;
  const unA = sentences.find((s) => s.text.includes("building"))!;
  const unB = sentences.find((s) => s.text.includes("letter"))!;

  const chart = [
    {
      pair: "paraphrase (fox jumps / swift brown fox)",
      cosine: cosineSimilarity(parA.embedding, parB.embedding),
      euclidean: euclideanDistance(parA.embedding, parB.embedding),
      sharedWords: 4,
    },
    {
      pair: "unrelated (building / letter)",
      cosine: cosineSimilarity(unA.embedding, unB.embedding),
      euclidean: euclideanDistance(unA.embedding, unB.embedding),
      sharedWords: 0,
    },
  ];

  res.json({
    success: true,
    chart,
    insight: "Paraphrases cluster (high cosine) even with shared words. Unrelated sentences have low cosine despite any word overlap.",
  });
});

/** GET /vector-arithmetic — demonstrate king - man + woman ≈ queen (ch 5) */
router.get("/vector-arithmetic", (_req: Request, res: Response) => {
  const examples = getVectorArithmeticExamples();
  res.json({
    success: true,
    examples,
  });
});

export default router;
```

## 3. Block-by-Block Explanation

### `import { Router } from "express"`
- `Router` is a mini-express app that can mount routes on a path prefix.

### `router.get("/health", ...)` — Health check
- Returns `{ success: true, status: "ok" }`. Used for monitoring and load balancers.

### `router.get("/sentences", sentenceController.getAll)`
- Delegates to the controller. Zero business logic in the route.

### `router.get("/similarity", similarityController.getSimilarity)`
- Delegates to the controller which computes all 4 similarity measures for two sentences.

### `router.get("/neighbors", neighborController.getNeighbors)`
- Delegates to the controller which performs nearest-neighbour search.

### `router.get("/similarity/chart", ...)`
- Returns the **build-target chart data**.
- Picks one paraphrase pair (high cosine) and one unrelated pair (low cosine).
- Shows the learner the key insight: *paraphrases cluster, word-overlap does not.*

### `router.get("/vector-arithmetic", ...)`
- Demonstrates `king − man + woman ≈ queen`.

### `export default router;`
- This is a **default export**. `src/index.ts` imports it as `import router from "./routes/index.js"`.

## 4. File: `src/index.ts`

```typescript
// index.ts — Application entry point

import express from "express";
import dotenv from "dotenv";
import config from "./config/config.js";
import router from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Load .env (config/config.ts already does this, but this is explicit)
dotenv.config();

const app = express();
const PORT = config.port;

// Request body parser (needed for POST/PUT in future chapters)
app.use(express.json());

// Mount all feature routes on the /api base path
app.use("/api", router);

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: _req.path,
  });
});

// Centralised error handler (must be last)
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`\n  🎓 FDE & GenAI Mastery — Lecture 12: Vector Embeddings`);
  console.log(`  📡 Server running at http://localhost:${PORT}`);
  console.log(`  🛠️  Endpoints:`);
  console.log(`       GET  /api/health`);
  console.log(`       GET  /api/sentences`);
  console.log(`       GET  /api/similarity?a=&b=`);
  console.log(`       GET  /api/neighbors?text=&top=`);
  console.log(`       GET  /api/similarity/chart`);
  console.log(`       GET  /api/vector-arithmetic`);
  console.log(`  📖 Start with: GET /api/similarity/chart (shows the build-target insight)\n`);
});
```

## 5. Block-by-Block Explanation

### `import express from "express"`
- Express is a function that creates an app. `const app = express()`.

### `import config from "./config/config.js"`
- Loads the config (port, env, etc.). No magic numbers in the rest of the app.

### `app.use(express.json())`
- Parses incoming JSON request bodies. Required for POST/PUT routes in future chapters.

### `app.use("/api", router)`
- Mounts the entire router under the `/api` prefix. So `/health` becomes `/api/health`.

### `app.use((_req, res) => { ... 404 ... })`
- Catches any request that didn't match a defined route and returns a 404.

### `app.use(errorHandler)`
- The error-handling middleware (4th arg `err, req, res, next`). Must be registered
  **after** all other routes. Catches any error thrown anywhere in the request lifecycle.

### `app.listen(PORT, () => { ... })`
- Binds the server to the port. The callback logs the running message and available
  endpoints so the developer knows what to test.
