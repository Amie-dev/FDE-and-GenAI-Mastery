// ============================================================================
// types/index.ts — Shared TypeScript interfaces for Vectorless RAG & LLM Wiki
// ============================================================================

// A single node in the hierarchical document tree (Vectorless RAG).
// Each node represents one location: Document → Chapter → Section → Subsection → Page.
export interface TreeNode {
  nodeId: string;               // Unique id of the node
  title: string;                // Heading / section title
  level: number;                // 0 = doc, 1 = chapter, 2 = section, 3 = subsection
  pageRange: [number, number];  // [startPage, endPage] in source document
  parentId: string | null;      // Parent node id (null for root)
  childrenIds: string[];        // Child node ids
  summary: string;              // LLM-generated summary of this node
  keywords: string[];           // Keywords extracted from this node
  sourceFile: string;           // Path to the original source file
}

// Lightweight catalog entry used by LLM Wiki (metadata only, no full content).
export interface CatalogEntry {
  filePath: string;     // Path to the markdown file in the vault
  title: string;        // Document title
  summary: string;      // Short summary (Pass 1 scans this)
  tags: string[];       // Tags for filtering (Pass 1 scans this)
}

// Result of a tree search: the found node plus the navigation path taken.
export interface TreeSearchResult {
  node: TreeNode;           // The target node found
  navigationPath: string[]; // Titles from root to this node (explainable path)
  content: string;          // Lazy-loaded full content of the node
}

// Result of two-pass retrieval (LLM Wiki).
export interface TwoPassResult {
  candidates: CatalogEntry[];   // Pass 1 selected candidates
  documents: { filePath: string; content: string }[]; // Pass 2 loaded full content
  answer: string;               // LLM-generated answer from combined context
}