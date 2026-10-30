import { CatalogEntry, TwoPassResult } from '../types/index';
import { readFileContent } from './wikiService';

// ============================================================================
// services/twoPassRetrievalService.ts — LLM Wiki: Two-Pass Retrieval
// ============================================================================
//
// Two-Pass Retrieval separates lightweight scanning from expensive loading:
//   Pass 1: Scan the lightweight catalog (titles, summaries, tags) — cheap
//   Pass 2: Load full content only for the candidates Pass 1 selected — targeted
// ============================================================================

// Mock: LLM checks whether a catalog entry is relevant to the query.
// Returns true if the summary/tags suggest the file may contain the answer.
async function llmRelevanceCheck(query: string, entry: CatalogEntry): Promise<boolean> {
  const lower = query.toLowerCase();
  const haystack = `${entry.title} ${entry.summary} ${entry.tags.join(' ')}`.toLowerCase();
  return haystack.split(' ').some((word) => word.length > 3 && lower.includes(word));
}

// Pass 1 — Scan lightweight catalog for candidates.
export async function pass1Scan(query: string, catalog: CatalogEntry[]): Promise<CatalogEntry[]> {
  const candidates: CatalogEntry[] = [];
  for (const entry of catalog) {
    const isRelevant = await llmRelevanceCheck(query, entry);
    if (isRelevant) {
      candidates.push(entry);
    }
  }
  return candidates;
}

// Pass 2 — Load full content only for the selected candidates.
export async function pass2Load(candidates: CatalogEntry[]): Promise<{ filePath: string; content: string }[]> {
  const documents: { filePath: string; content: string }[] = [];
  for (const candidate of candidates) {
    const content = readFileContent(candidate.filePath);
    documents.push({ filePath: candidate.filePath, content });
  }
  return documents;
}

// End-to-end two-pass retrieval.
export async function retrieve(
  query: string,
  catalog: CatalogEntry[]
): Promise<TwoPassResult> {
  // Pass 1: cheap metadata scan
  const candidates = await pass1Scan(query, catalog);

  // Pass 2: expensive but targeted full-content loading
  const documents = await pass2Load(candidates);

  // Combine full content into context and generate an answer
  const context = documents.map((d) => d.content).join('\n\n');
  const answer = context
    ? `Based on the retrieved documents, here is the answer to "${query}":\n\n${context.slice(0, 500)}...`
    : `No relevant documents found for "${query}".`;

  return { candidates, documents, answer };
}