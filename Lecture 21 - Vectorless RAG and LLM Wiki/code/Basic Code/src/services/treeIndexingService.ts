import { TreeNode } from '../types/index';

// ============================================================================
// services/treeIndexingService.ts — Vectorless RAG: Hierarchical Tree Indexing
// ============================================================================
//
// Builds a hierarchical tree representation of a document.
// Instead of flat chunks + embeddings (Vector RAG), we preserve the document
// structure: chapters, sections, subsections, and pages.
// ============================================================================

// Minimal in-memory tree index: a flat map keyed by nodeId for O(1) lookup.
const treeIndex = new Map<string, TreeNode>();
let rootNode: TreeNode | null = null;

// Mock: parses a document and returns a flat list of sections.
// In production this would parse PDF / Markdown headings into sections.
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

// Mock: LLM summarizes a section's content.
async function llmSummarize(content: string): Promise<string> {
  return `Summary of: ${content.slice(0, 40)}...`;
}

// Mock: LLM extracts keywords from content.
async function llmExtractKeywords(content: string): Promise<string[]> {
  return content.split(' ').filter((w) => w.length > 5).slice(0, 5);
}

// Generate a deterministic node id from a section path.
function generateNodeId(path: string): string {
  return `node-${path}`;
}

// Build a single tree node with LLM-generated metadata.
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

// Build the full tree index from a document path.
export async function buildTreeIndex(documentPath: string): Promise<{ root: TreeNode | null; index: Map<string, TreeNode> }> {
  // 1. Parse document structure into sections
  const structure = await parseDocumentStructure(documentPath);

  // 2. Create tree nodes (with parent/child links flattened into ids)
  const nodes: TreeNode[] = [];
  for (const section of structure) {
    const node = await createNode(section, documentPath);
    nodes.push(node);
  }

  // 3. Build the flat index map for O(1) lookup
  const index = new Map<string, TreeNode>();
  for (const node of nodes) {
    index.set(node.nodeId, node);
  }

  // 4. Root is the first top-level node (level 1) — conceptually the document root
  rootNode = nodes.find((n) => n.level === 1) || null;

  // Persist in-memory
  for (const [id, node] of index) {
    treeIndex.set(id, node);
  }

  return { root: rootNode, index };
}

// Get a node by its id (O(1) lookup).
export function getNode(nodeId: string): TreeNode | undefined {
  return treeIndex.get(nodeId);
}

// Build the root-to-node lineage path (explainable retrieval path).
export function getLineagePath(nodeId: string): string[] {
  const path: string[] = [];
  let current: TreeNode | undefined = treeIndex.get(nodeId);
  while (current) {
    path.unshift(current.title);
    current = current.parentId ? treeIndex.get(current.parentId) : undefined;
  }
  return path;
}