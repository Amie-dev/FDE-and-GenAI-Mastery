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