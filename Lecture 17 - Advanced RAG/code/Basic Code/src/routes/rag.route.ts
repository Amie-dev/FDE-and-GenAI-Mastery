import { Router } from "express";
import { ragQuery } from "../controllers/rag.controller";

const router = Router();

/**
 * POST /rag/query — Advanced RAG pipeline endpoint.
 * Body: { "query": "Can I return my damaged headphones after 10 days?" }
 */
router.post("/query", ragQuery);

export default router;