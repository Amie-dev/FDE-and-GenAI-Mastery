# Chapter 4 — Agentic Tree Search Service (Vectorless RAG)

> File: `src/services/agenticTreeSearchService.ts`
>
> Purpose: Implements **Agentic Tree Search** — the LLM acts as a navigation agent that walks down the document tree, evaluating node summaries and choosing the most relevant branch at each level. Irrelevant branches are pruned before their content is loaded.

## Full Code File

```typescript
import { TreeNode, TreeSearchResult } from '../types/index';
import { getNode } from './treeIndexingService';

async function llmEvaluateBranch(query: string, children: TreeNode[]): Promise<string | null> {
  if (children.length === 0) return null;
  const lower = query.toLowerCase();
  for (const child of children) {
    if (child.summary.toLowerCase().includes(lower.split(' ')[0]) || child.title.toLowerCase().includes(lower)) {
      return child.nodeId;
    }
  }
  return children[0].nodeId;
}

async function lazyLoadNodeContent(node: TreeNode): Promise<string> {
  return `Full content of "${node.title}" (pages ${node.pageRange[0]}-${node.pageRange[1]}): ${node.summary}`;
}

export async function search(query: string, root: TreeNode | null): Promise<TreeSearchResult | null> {
  if (!root) return null;
  let current: TreeNode | null = root;
  const navigationPath: string[] = [current.title];
  while (current && current.childrenIds.length > 0) {
    const children = current.childrenIds
      .map((id) => getNode(id))
      .filter((n): n is TreeNode => n !== undefined);
    const selectedId = await llmEvaluateBranch(query, children);
    if (!selectedId) break;
    const next = getNode(selectedId);
    if (!next) break;
    current = next;
    navigationPath.push(current.title);
  }
  const content = current ? await lazyLoadNodeContent(current) : '';
  return current ? { node: current, navigationPath, content } : null;
}
```

## Command (if needed)

None — uses only the shared types and the `getNode` helper from the tree indexing service.

## Block-by-Block Explanation

### Block 1 — Mock LLM branch evaluation
```typescript
async function llmEvaluateBranch(query: string, children: TreeNode[]): Promise<string | null> { ... }
```
**What this does:** Simulates an LLM deciding which child branch is most relevant to the user's query.

**How it works:** Loops through child nodes and checks if query keywords appear in the child's summary or title. Returns the first matching child's `nodeId`, or falls back to the first child. In production, this would be a real LLM call that reasons about relevance.

### Block 2 — Mock lazy content loading
```typescript
async function lazyLoadNodeContent(node: TreeNode): Promise<string> { ... }
```
**What this does:** Simulates loading the full content of a target node — **only after** the agent has navigated to it.

**How it works:** Uses `node.pageRange` to know which pages to load (lazy loading). In production, this would read the actual pages from the source document. Full content is loaded only at the end, not during tree traversal.

### Block 3 — Agentic tree search
```typescript
export async function search(query: string, root: TreeNode | null): Promise<TreeSearchResult | null> { ... }
```
**What this does:** The main agentic search function. Starts at the root, repeatedly asks the LLM to pick the best child branch, walks down until a leaf is reached, then lazy-loads its content.

**How it works:**
1. Start at the root node, record its title in `navigationPath`.
2. While the current node has children: fetch all child nodes, ask `llmEvaluateBranch` which is most relevant, move to the selected child, record its title.
3. When no more children (leaf reached), lazy-load the full content.
4. Return the result: found node, navigation path (explainable), and full content.

**Why this matters:** This mirrors the notes' example (Chapter 03): "Sticky sessions + ALB failure → Chapter 2 → Section 2.2 → Subsection 2.2.2". The agent prunes irrelevant chapters and navigates directly to the relevant section.

## Related Note Feature

**Chapter 03 — Agentic Tree Search & LLM Relevance Retrieval:**
- "The LLM evaluates node summaries and chooses which branches to explore."
- "Irrelevant branches can be pruned before loading their raw content."
- "Tree traversal provides an explicit and traceable retrieval path."
- "Lazy loading retrieves full text only after reaching a relevant node or page range."

