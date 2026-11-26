import { Router } from 'express';
import { buildTree, searchTree } from '../controllers/treeController';
import { ingest, getCatalog, searchWiki } from '../controllers/wikiController';

// ============================================================================
// routes/index.ts — API route definitions
// ============================================================================

const router = Router();

// --- Vectorless RAG & Agentic Tree Search routes ---
router.post('/tree/build', buildTree);
router.post('/tree/search', searchTree);

// --- LLM Wiki & Two-Pass Retrieval routes ---
router.post('/wiki/ingest', ingest);
router.get('/wiki/catalog', getCatalog);
router.post('/wiki/search', searchWiki);

export default router;