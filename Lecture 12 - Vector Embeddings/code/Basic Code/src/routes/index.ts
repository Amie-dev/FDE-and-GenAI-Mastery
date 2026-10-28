// routes/index.ts — Mount all feature routes onto the app

import { Router, Request, Response } from "express";
import { getSentences } from "../services/embeddings.js";
import { getVectorArithmeticExamples } from "../services/vectorArithmetic.js";
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

/** GET /sentences — return the full corpus of 30 embedded sentences (ch 5) */
router.get("/sentences", sentenceController.getAll);

/** GET /similarity?a=text&b=text — compute all 4 similarity measures (ch 3) */
router.get("/similarity", similarityController.getSimilarity);

/** GET /neighbors?text=…&top=3 — find nearest neighbours (ch 5 build target) */
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
