import { TreeNode, TreeSearchResult } from '../types/index';
import { getNode } from './treeIndexingService';

// ============================================================================
// services/agenticTreeSearchService.ts — Vectorless RAG: Agentic Tree Search
// ============================================================================
//
// The LLM acts as a navigation agent. Instead of similarity search over flat
// chunks, it evaluates node summaries and walks down the most relevant branch.
// Irrelevant branches are pruned before their full content is loaded.
// ============================================================================

// Mock: LLM evaluates which child branch is most relevant to the query.
// Returns the child nodeId to explore, or null if none are relevant.
async function llmEvaluateBranch(query: string, children: TreeNode[]): Promise<string | null> {
  if (children.length === 0) return null;
  // Simple keyword match as a stand-in for real LLM reasoning.
  const lower = query.toLowerCase();
  for (const child of children) {
    if (child.summary.toLowerCase().includes(lower.split(' ')[0]) || child.title.toLowerCase().includes(lower)) {
      return child.nodeId;
    }
  }
  return children[0].nodeId; // fallback: explore first child
}

// Mock: lazy-load full content for a target node (only its page range).
async function lazyLoadNodeContent(node: TreeNode): Promise<string> {
  return `Full content of "${node.title}" (pages ${node.pageRange[0]}-${node.pageRange[1]}): ${node.summary}`;
}

// Agentic tree search: navigate from root down to the most relevant leaf node.
export async function search(query: string, root: TreeNode | null): Promise<TreeSearchResult | null> {
  if (!root) return null;

  let current: TreeNode | null = root;
  const navigationPath: string[] = [current.title];

  // Walk down the tree, letting the LLM pick the best branch at each level.
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

  // Leaf reached — lazy load its full content (only now, not earlier).
  const content = current ? await lazyLoadNodeContent(current) : '';

  return current
    ? { node: current, navigationPath, content }
    : null;
}