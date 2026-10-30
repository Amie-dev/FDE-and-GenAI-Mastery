# Chapter 3 — Tree Indexing Service (Vectorless RAG)

> File: `src/services/treeIndexingService.ts`
>
> Purpose: Builds a hierarchical tree representation of a document. This is the core of **Vectorless RAG** — instead of flat chunks + embeddings, we preserve document structure (chapters, sections, subsections, pages) as a tree.

## Full Code File

```typescript
import { TreeNode } from '../types/index';

const treeIndex = new Map<string, TreeNode>();
let rootNode: TreeNode | null = null;

async function parseDocumentStructure(documentPath: string) {
  return [
    { path: 'ch1', title: 'Chapter 1: Networking', depth: 1, startPage: 1, endPage: 50, children: [], content: 'Networking fundamentals...' },
    { path: 'ch2', title: 'Chapter 2: Load Balancing', depth: 1, startPage: 51, endPage: 120, children: [
      { path: 'ch2-sec1', title: 'Section 2.1: Sticky Sessions', depth: 2, startPage: 60, endPage: 80, children: [], content: 'Cookie-based sticky sessions...' },
      { path: 'ch2-sec2', title: 'Section 2.2: Session Failover', depth: 2, startPage: 81, endPage: 100, children: [], content: 'ALB failure and session recovery...' },
    ], content: 'Load balancing architecture...' },
    { path: 'ch3', title: 'Chapter 3: Database Replication', depth: 1, startPage: 121, endPage: 200, children: [], content: 'Primary-replica replication...' },
  ];
}

async function llmSummarize(content: string): Promise<string> {
  return `Summary of: ${content.slice(0, 40)}...`;
}

async function llmExtractKeywords(content: string): Promise<string[]> {
  return content.split(' ').filter((w) => w.length > 5).slice(0, 5);
}

function generateNodeId(path: string): string {
  return `node-${path}`;
}

async function createNode(section: any, sourceFile: string): Promise<TreeNode> {
  const summary = await llmSummarize(section.content);
  const keywords = await llmExtractKeywords(section.content);
  return {
    nodeId: generateNodeId(section.path),
    title: section.title,
    level: section.depth,
    pageRange: [section.startPage, section.endPage],
    parentId: section.parentPath ? generateNodeId(section.parentPath) : null,
    childrenIds: section.children.map((c: any) => generateNodeId(c.path)),
    summary,
    keywords,
    sourceFile,
  };
}

export async function buildTreeIndex(documentPath: string): Promise<{ root: TreeNode | null; index: Map<string, TreeNode> }> {
  const structure = await parseDocumentStructure(documentPath);
  const nodes: TreeNode[] = [];
  for (const section of structure) {
    const node = await createNode(section, documentPath);
    nodes.push(node);
  }
  const index = new Map<string, TreeNode>();
  for (const node of nodes) {
    index.set(node.nodeId, node);
  }
  rootNode = nodes.find((n) => n.level === 1) || null;
  for (const [id, node] of index) {
    treeIndex.set(id, node);
  }
  return { root: rootNode, index };
}

export function getNode(nodeId: string): TreeNode | undefined {
  return treeIndex.get(nodeId);
}

export function getLineagePath(nodeId: string): string[] {
  const path: string[] = [];
  let current: TreeNode | undefined = treeIndex.get(nodeId);
  while (current) {
    path.unshift(current.title);
    current = current.parentId ? treeIndex.get(current.parentId) : undefined;
  }
  return path;
}
```

## Command (if needed)

None — uses only TypeScript built-in `Map` and the shared `TreeNode` type.


## Block-by-Block Explanation

### Block 1 — In-memory index storage
```typescript
const treeIndex = new Map<string, TreeNode>();
let rootNode: TreeNode | null = null;
```
**What this does:** Creates a flat map (nodeId → TreeNode) for O(1) node lookup, plus a variable to track the root node.

**How it works:** Storing the tree as a flat map lets us find any node instantly by id, while `parentId`/`childrenIds` fields preserve the hierarchy relationships.

### Block 2 — Mock document parser
```typescript
async function parseDocumentStructure(documentPath: string) { ... }
```
**What this does:** Returns a hardcoded list of document sections (chapters with nested sections). In production, this would parse actual PDF/Markdown headings.

**How it works:** Each section has `path`, `title`, `depth`, `pageRange`, `children`, and `content`. This mirrors the notes' concept of "Structural Parsing" (Chapter 02).

### Block 3 — Mock LLM summarization
```typescript
async function llmSummarize(content: string): Promise<string> { ... }
async function llmExtractKeywords(content: string): Promise<string[]> { ... }
```
**What this does:** Stand-in functions for real LLM calls that generate a summary and extract keywords from content.

**How it works:** These simulate what an LLM would do — produce a short summary and a keyword list. In production, you'd call an LLM API here.

### Block 4 — Create a single tree node
```typescript
async function createNode(section: any, sourceFile: string): Promise<TreeNode> { ... }
```
**What this does:** Builds one `TreeNode` from a parsed section, using LLM-generated summary and keywords.

**How it works:** Sets `nodeId`, `title`, `level`, `pageRange`, `parentId`, `childrenIds`, `summary`, `keywords`, and `sourceFile`. Each field maps directly to the `TreeNode` interface defined in Chapter 2.

### Block 5 — Build the full tree index
```typescript
export async function buildTreeIndex(documentPath: string): Promise<{ root: TreeNode | null; index: Map<string, TreeNode> }> { ... }
```
**What this does:** Orchestrates the full indexing pipeline: parse → create nodes → build index map → identify root → persist in memory.

**How it works:**
1. Parses the document structure
2. Creates a TreeNode for each section (with LLM metadata)
3. Stores all nodes in a flat `Map` for O(1) lookup
4. Picks the first level-1 node as the root
5. Returns both the root and the full index

### Block 6 — Get node by id
```typescript
export function getNode(nodeId: string): TreeNode | undefined {
  return treeIndex.get(nodeId);
}
```
**What this does:** Retrieves a node from the index by its id (O(1)).

**How it works:** Direct map lookup — no tree traversal needed.

### Block 7 — Get lineage path
```typescript
export function getLineagePath(nodeId: string): string[] {
  const path: string[] = [];
  let current: TreeNode | undefined = treeIndex.get(nodeId);
  while (current) {
    path.unshift(current.title);
    current = current.parentId ? treeIndex.get(current.parentId) : undefined;
  }
  return path;
}
```
**What this does:** Walks from a node up to the root via `parentId`, collecting titles along the way.

**How it works:** Starts at the target node, follows `parentId` links upward, prepends each title to the path. The result is an explainable root-to-node path (e.g., `["Document", "Chapter 2", "Section 2.2"]`).

## Related Note Feature

**Chapter 02 — Vectorless RAG & Tree-Structured Indexing:**
- "Documents are represented as hierarchical trees instead of flat chunks."
- "Each tree node can contain summaries, keywords, entities, page ranges, and parent/child relationships."
- "Raw content can be lazy-loaded only after the relevant branch is identified."
