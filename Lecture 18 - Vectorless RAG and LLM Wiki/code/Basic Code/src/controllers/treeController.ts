import { Request, Response } from 'express';
import { buildTreeIndex, getLineagePath } from '../services/treeIndexingService';
import { search } from '../services/agenticTreeSearchService';

// ============================================================================
// controllers/treeController.ts — Vectorless RAG & Agentic Tree Search endpoints
// ============================================================================

// POST /tree/build — Build a hierarchical tree index from a document.
// Demonstrates: structural parsing → tree nodes → flat index (no embeddings).
export async function buildTree(req: Request, res: Response): Promise<void> {
  const { documentPath } = req.body as { documentPath?: string };
  if (!documentPath) {
    res.status(400).json({ error: 'documentPath is required' });
    return;
  }

  const { root, index } = await buildTreeIndex(documentPath);
  res.json({
    message: 'Tree index built',
    root: root ? { nodeId: root.nodeId, title: root.title, level: root.level } : null,
    totalNodes: index.size,
  });
}

// POST /tree/search — Agentic tree search for a query.
// Demonstrates: LLM navigates the tree branch by branch → prunes irrelevant → lazy loads content.
export async function searchTree(req: Request, res: Response): Promise<void> {
  const { query, nodeId } = req.body as { query?: string; nodeId?: string };

  // Build a demo tree if none exists yet (so the endpoint works out of the box).
  const { root } = await buildTreeIndex('./demo-document.md');

  const result = await search(query || 'sticky sessions', root);

  if (!result) {
    res.status(404).json({ error: 'No relevant node found' });
    return;
  }

  // Explainable path: show exactly which branches were navigated (root → … → leaf).
  const lineage = getLineagePath(result.node.nodeId);

  res.json({
    query,
    foundNode: {
      nodeId: result.node.nodeId,
      title: result.node.title,
      level: result.node.level,
      pageRange: result.node.pageRange,
      summary: result.node.summary,
    },
    navigationPath: result.navigationPath,      // explicit path taken
    lineage,                                     // root-to-node path
    content: result.content,                     // lazy-loaded full content
  });
}