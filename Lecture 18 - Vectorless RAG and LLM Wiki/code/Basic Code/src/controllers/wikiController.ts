import { Request, Response } from 'express';
import { ingestFile, listCatalog, loadCatalogFromDisk } from '../services/wikiService';
import { retrieve } from '../services/twoPassRetrievalService';

// ============================================================================
// controllers/wikiController.ts — LLM Wiki & Two-Pass Retrieval endpoints
// ============================================================================

// Load existing catalog from disk on startup.
loadCatalogFromDisk();

// POST /wiki/ingest — Ingest a document into the LLM Wiki vault.
// Demonstrates: LLM librarian → organize → summarize → tag → write Markdown + frontmatter → update catalog.
export async function ingest(req: Request, res: Response): Promise<void> {
  const { sourcePath } = req.body as { sourcePath?: string };
  if (!sourcePath) {
    res.status(400).json({ error: 'sourcePath is required' });
    return;
  }

  try {
    const entry = await ingestFile(sourcePath);
    res.json({ message: 'File ingested into wiki', entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// GET /wiki/catalog — List the lightweight catalog (metadata only).
export function getCatalog(_req: Request, res: Response): void {
  const entries = listCatalog();
  res.json({ total: entries.length, entries });
}

// POST /wiki/search — Two-pass retrieval search.
// Demonstrates: Pass 1 scan catalog → Pass 2 load only selected full content → LLM answer.
export async function searchWiki(req: Request, res: Response): Promise<void> {
  const { query } = req.body as { query?: string };
  if (!query) {
    res.status(400).json({ error: 'query is required' });
    return;
  }

  const catalog = listCatalog();
  const result = await retrieve(query, catalog);

  res.json({
    query,
    pass1Candidates: result.candidates.map((c) => ({ title: c.title, filePath: c.filePath, tags: c.tags })),
    pass2Loaded: result.documents.length,
    answer: result.answer,
  });
}