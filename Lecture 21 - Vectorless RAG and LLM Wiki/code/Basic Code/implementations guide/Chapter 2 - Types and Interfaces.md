# Chapter 2 — Types and Interfaces

> File: `src/types/index.ts`
>
> Purpose: Defines all shared TypeScript interfaces used across services and controllers. This keeps data shapes consistent and makes the code self-documenting — important for learning what each node and entry contains.

## Full Code File

```typescript
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
```

## Command (if needed)

None — this is a pure type-definition file with no runtime dependencies.

## Block-by-Block Explanation

### Block 1 — TreeNode interface
```typescript
export interface TreeNode {
  nodeId: string;
  title: string;
  level: number;
  pageRange: [number, number];
  parentId: string | null;
  childrenIds: string[];
  summary: string;
  keywords: string[];
  sourceFile: string;
}
```
**What this does:** Defines the shape of one node in the hierarchical document tree.

**How it works:** Each field maps to a concept from the notes (Chapter 02):
- `nodeId` / `parentId` / `childrenIds` → parent/child relationships
- `level` → depth in the hierarchy (doc/chapter/section/subsection)
- `pageRange` → which pages this node covers (for lazy loading)
- `summary` / `keywords` → metadata used for navigation without loading full content
- `sourceFile` → path back to the original document

### Block 2 — CatalogEntry interface
```typescript
export interface CatalogEntry {
  filePath: string;
  title: string;
  summary: string;
  tags: string[];
}
```
**What this does:** Defines a lightweight metadata entry in the LLM Wiki vault.

**How it works:** Contains only metadata (title, summary, tags) — no full content. This is what **Pass 1** of two-pass retrieval scans (Chapter 05 notes).

### Block 3 — TreeSearchResult interface
```typescript
export interface TreeSearchResult {
  node: TreeNode;
  navigationPath: string[];
  content: string;
}
```
**What this does:** Defines the result of an agentic tree search.

**How it works:** Returns the found node, the explicit path taken through the tree (explainability), and the lazy-loaded full content.

### Block 4 — TwoPassResult interface
```typescript
export interface TwoPassResult {
  candidates: CatalogEntry[];
  documents: { filePath: string; content: string }[];
  answer: string;
}
```
**What this does:** Defines the result of two-pass retrieval.

**How it works:** Combines Pass 1 candidates, Pass 2 loaded documents, and the final LLM answer.

## Related Note Feature

- **Chapter 02** notes: "Each node contains: Title & level, Page range, Parent/children relationships, Summary, Keywords & entities"
- **Chapter 05** notes: Pass 1 reads "Titles, summaries, tags, page ranges" (metadata only)
