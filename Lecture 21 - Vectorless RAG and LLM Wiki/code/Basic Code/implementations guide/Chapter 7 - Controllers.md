# Chapter 7 — Controllers

> Files: `src/controllers/treeController.ts` and `src/controllers/wikiController.ts`
>
> Purpose: Express route handlers that orchestrate the core services. Controllers receive HTTP requests, call the appropriate service, and return JSON responses. They contain no business logic — only request/response handling.

## Full Code File — treeController.ts

```typescript
import { Request, Response } from 'express';
import { buildTreeIndex, getLineagePath } from '../services/treeIndexingService';
import { search } from '../services/agenticTreeSearchService';

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

export async function searchTree(req: Request, res: Response): Promise<void> {
  const { query } = req.body as { query?: string };
  const { root } = await buildTreeIndex('./demo-document.md');
  const result = await search(query || 'sticky sessions', root);
  if (!result) {
    res.status(404).json({ error: 'No relevant node found' });
    return;
  }
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
    navigationPath: result.navigationPath,
    lineage,
    content: result.content,
  });
}
```

## Full Code File — wikiController.ts

```typescript
import { Request, Response } from 'express';
import { ingestFile, listCatalog, loadCatalogFromDisk } from '../services/wikiService';
import { retrieve } from '../services/twoPassRetrievalService';

loadCatalogFromDisk();

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

export function getCatalog(_req: Request, res: Response): void {
  const entries = listCatalog();
  res.json({ total: entries.length, entries });
}

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
```

## Command (if needed)

None — uses only Express `Request`/`Response` types and the services from Chapters 3-6.

## Block-by-Block Explanation — treeController.ts

### Block 1 — buildTree handler
```typescript
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
```
**What this does:** HTTP POST handler for `/api/tree/build`. Reads `documentPath` from the request body, builds the hierarchical tree index, and returns the root node info and total node count.

**How it works:** Validates the required `documentPath` field, calls `buildTreeIndex` from the tree indexing service (Chapter 3), and returns a JSON response with the root node and total number of indexed nodes. This demonstrates the Vectorless RAG indexing feature from Chapter 02 notes.

### Block 2 — searchTree handler
```typescript
export async function searchTree(req: Request, res: Response): Promise<void> {
  const { query } = req.body as { query?: string };
  const { root } = await buildTreeIndex('./demo-document.md');
  const result = await search(query || 'sticky sessions', root);
  if (!result) {
    res.status(404).json({ error: 'No relevant node found' });
    return;
  }
  const lineage = getLineagePath(result.node.nodeId);
  res.json({
    query,
    foundNode: { ... },
    navigationPath: result.navigationPath,
    lineage,
    content: result.content,
  });
}
```
**What this does:** HTTP POST handler for `/api/tree/search`. Reads a query from the request body, builds a demo tree, runs agentic tree search, and returns the found node with its explainable navigation path and lazy-loaded content.

**How it works:** Calls `buildTreeIndex` to create a tree, then calls `search` (Chapter 4) to navigate it agentically. Uses `getLineagePath` (Chapter 3) to get the root-to-node path. Returns the found node, navigation path, lineage, and full content. This demonstrates Agentic Tree Search from Chapter 03 notes.

## Block-by-Block Explanation — wikiController.ts

### Block 1 — Ingest handler
```typescript
export async function ingest(req: Request, res: Response): Promise<void> { ... }
```
**What this does:** HTTP POST handler for `/api/wiki/ingest`. Reads `sourcePath` from the request body, ingests the file into the LLM Wiki vault, and returns the created catalog entry.

**How it works:** Validates `sourcePath`, calls `ingestFile` from the wiki service (Chapter 5), and returns the entry. Errors are caught and returned as 500 responses. This demonstrates the LLM Wiki ingestion feature from Chapter 04 notes.

### Block 2 — Get catalog handler
```typescript
export function getCatalog(_req: Request, res: Response): void {
  const entries = listCatalog();
  res.json({ total: entries.length, entries });
}
```
**What this does:** HTTP GET handler for `/api/wiki/catalog`. Returns all lightweight catalog entries (metadata only).

**How it works:** Calls `listCatalog` from the wiki service and returns the entries as JSON. No full content is loaded — this is the cheap Pass 1 scan from Chapter 05 notes.

### Block 3 — Search wiki handler
```typescript
export async function searchWiki(req: Request, res: Response): Promise<void> { ... }
```
**What this does:** HTTP POST handler for `/api/wiki/search`. Reads a query, runs two-pass retrieval, and returns Pass 1 candidates, Pass 2 document count, and the generated answer.

**How it works:** Validates `query`, calls `retrieve` from the two-pass retrieval service (Chapter 6), and returns the results. This demonstrates Two-Pass Retrieval from Chapter 05 notes.

