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