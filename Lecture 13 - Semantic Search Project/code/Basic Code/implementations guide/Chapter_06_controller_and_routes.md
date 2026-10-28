# Chapter 06 — Controller & Routes (HTTP wiring)

The controller turns an HTTP request into a call to `RecommendationService` and
sends back JSON. The routes file does two things:

1. **Builds the dependency chain once at startup** (the "service wiring" from
   Chapter 07 of the notes): `EmbeddingService → VectorStoreService →
   RecommendationService → SearchController → router`.
2. **Maps URLs to methods**, and adds three support endpoints that are *not*
   search logic (`GET /health`, `GET /catalog`, `GET /status`) as inline handlers.

## Files in this chapter
| File | Purpose |
|------|---------|
| `src/controllers/search.controller.ts` | `SearchController` — `search()` and `similar()` only. |
| `src/routes/search.routes.ts` | `createRouter()` — wires services + attaches all routes. |

> ⚠️ The directory is `src/controllers/` (**plural**). The controller is
> `SearchController`; the router factory is `createRouter` (not
> `createSearchRouter`). `index.ts` imports `createRouter` from here.

## Full code

### `src/controllers/search.controller.ts`

```ts
/**
 * HTTP controller for semantic search + movie recommendation.
 *
 * The controller has ONE job: take the HTTP request, read the query
 * parameters, call the services, and send back a JSON response.
 *
 * - `GET /search?query=...`  → semantic search
 * - `GET /similar?movieId=...` → find similar movies
 *
 * Notice the pipeline order (Chapter 06):
 *   1. REPRESENT — embed the query (EmbeddingService)
 *   2. COMPARE — cosine similarity (RecommendationService)
 *   3. RANK    — sort by score, take top N
 */

import { Request, Response } from "express";
import { RecommendationService } from "../services/recommendation.service.js";

export class SearchController {
  constructor(private readonly recommendation: RecommendationService) {}

  search(req: Request, res: Response): void {
    const query = (req.query.query as string) || "";
    const topN = Math.min(Number(req.query.topN) || 5, 20);

    if (!query.trim()) {
      res.status(400).json({ error: "Missing required query parameter: query" });
      return;
    }

    const results = this.recommendation.search(query, topN);

    res.json({
      feature: "semantic_search",
      query,
      topN,
      count: results.length,
      results,
    });
  }

  similar(req: Request, res: Response): void {
    const movieId = (req.query.movieId as string) || "";
    const topN = Math.min(Number(req.query.topN) || 5, 20);

    if (!movieId) {
      res.status(400).json({ error: "Missing required query parameter: movieId" });
      return;
    }

    const results = this.recommendation.similarTo(movieId, topN);

    res.json({
      feature: "similar_movies",
      movieId,
      topN,
      count: results.length,
      results,
    });
  }
}
```

### `src/routes/search.routes.ts`

```ts
/**
 * Express routes for the Lecture 13 semantic search project.
 *
 * The router groups the endpoints so the main server file stays clean.
 *
 * - `GET /health`          → server health check (no inputs needed)
 * - `GET /search`          → semantic search (query + optional topN)
 * - `GET /similar`         → similar movies by id (movieId + optional topN)
 * - `GET /catalog`         → list all stored movies
 * - `GET /status`          → where we are in the pipeline (embedding cache, catalog count)
 */

import { Router } from "express";
import { SearchController } from "../controllers/search.controller.js";
import { RecommendationService } from "../services/recommendation.service.js";
import { VectorStoreService } from "../services/vector.store.service.js";
import { EmbeddingService } from "../services/embedding.service.js";

/**
 * Build the whole dependency chain once at startup, then attach it to
 * the router.  This is the "service wiring" step of Chapter 07.
 *
 * Order of construction (Chapter 06 mental model):
 *   1. EmbeddingService       (REPRESENT)
 *   2. VectorStoreService     (STORE, injects EmbeddingService)
 *   3. RecommendationService  (COMPARE + RANK, uses VectorStore)
 *   4. SearchController       (wires RecommendationService)
 *   5. router
 */
export function createRouter(): Router {
  const embeddingService = new EmbeddingService();
  const vectorStore = new VectorStoreService(embeddingService);
  const recommendation = new RecommendationService(vectorStore);
  const controller = new SearchController(recommendation);

  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "lecture-13-semantic-search" });
  });

  router.get("/catalog", (_req, res) => {
    const movies = vectorStore.getAll();
    res.json({ count: movies.length, movies });
  });

  router.get("/search", (req, res) => controller.search(req, res));

  router.get("/similar", (req, res) => controller.similar(req, res));

  router.get("/status", (_req, res) => {
    res.json({
      embeddingCacheSize: embeddingService.getEmbeddingCacheSize(),
      catalogCount: vectorStore.count(),
      features: ["semantic_search", "similar_movies", "catalog"],
    });
  });

  return router;
}
```
