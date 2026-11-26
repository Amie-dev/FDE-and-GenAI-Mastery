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