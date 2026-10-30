# Chapter 6 — Two-Pass Retrieval Service (LLM Wiki)

> File: `src/services/twoPassRetrievalService.ts`
>
> Purpose: Implements **Two-Pass Retrieval** — retrieval happens in two distinct stages. Pass 1 scans lightweight metadata (cheap). Pass 2 loads full content only for selected candidates (targeted, expensive but bounded).

## Full Code File

```typescript
import { CatalogEntry, TwoPassResult } from '../types/index';
import { readFileContent } from './wikiService';

async function llmRelevanceCheck(query: string, entry: CatalogEntry): Promise<boolean> {
  const lower = query.toLowerCase();
  const haystack = `${entry.title} ${entry.summary} ${entry.tags.join(' ')}`.toLowerCase();
  return haystack.split(' ').some((word) => word.length > 3 && lower.includes(word));
}

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

export async function pass2Load(candidates: CatalogEntry[]): Promise<{ filePath: string; content: string }[]> {
  const documents: { filePath: string; content: string }[] = [];
  for (const candidate of candidates) {
    const content = readFileContent(candidate.filePath);
    documents.push({ filePath: candidate.filePath, content });
  }
  return documents;
}

export async function retrieve(query: string, catalog: CatalogEntry[]): Promise<TwoPassResult> {
  const candidates = await pass1Scan(query, catalog);
  const documents = await pass2Load(candidates);
  const context = documents.map((d) => d.content).join('\n\n');
  const answer = context
    ? `Based on the retrieved documents, here is the answer to "${query}":\n\n${context.slice(0, 500)}...`
    : `No relevant documents found for "${query}".`;
  return { candidates, documents, answer };
}
```

## Command (if needed)

None — uses `readFileContent` from the wiki service and shared types.

## Block-by-Block Explanation

### Block 1 — Mock LLM relevance check
```typescript
async function llmRelevanceCheck(query: string, entry: CatalogEntry): Promise<boolean> { ... }
```
**What this does:** Simulates an LLM deciding whether a catalog entry might contain the answer to the query.

**How it works:** Combines the entry's title, summary, and tags into one string, then checks if any significant query word appears in it. Returns `true` if relevant. In production, this would be a real LLM relevance judgment.

### Block 2 — Pass 1: Scan lightweight catalog
```typescript
export async function pass1Scan(query: string, catalog: CatalogEntry[]): Promise<CatalogEntry[]> { ... }
```
**What this does:** Iterates over every catalog entry, checks relevance, and collects matching entries as candidates.

**How it works:** This is the **cheap** pass — it only reads metadata (title, summary, tags), never full content.

### Block 3 — Pass 2: Load full content for selected candidates
```typescript
export async function pass2Load(candidates: CatalogEntry[]): Promise<{ filePath: string; content: string }[]> { ... }
```
**What this does:** Reads the full content of each candidate file selected by Pass 1.

**How it works:** This is the **targeted expensive** pass — it loads full content, but only for the few files Pass 1 deemed relevant. This is the "selective full-content loading" from the notes.

### Block 4 — End-to-end two-pass retrieval
```typescript
export async function retrieve(query: string, catalog: CatalogEntry[]): Promise<TwoPassResult> { ... }
```
**What this does:** Orchestrates the complete two-pass retrieval: Pass 1 scan → Pass 2 load → combine into context → generate answer.

**How it works:**
1. **Pass 1:** `pass1Scan` returns candidates from metadata only (cheap).
2. **Pass 2:** `pass2Load` loads full content only for those candidates (targeted).
3. Combines all loaded content into one `context` string.
4. Generates a simple answer from the context.
5. Returns the full result including candidates, documents, and answer.

## Related Note Feature

**Chapter 05 — Two-Pass Retrieval & Lazy Loading:**
- "Pass 1: Lightweight scan of metadata — Titles, summaries, tags, page ranges, categories"
- "Pass 2: Selective full-content loading — Only the documents/files selected by Pass 1"
- Mental model: "Without Two-Pass: Load the whole library to read one page. With Two-Pass: Read the card catalog first, then go directly to the right book."
- Cost comparison: Two-Pass Retrieval = "Summaries + selected full docs = Low–Medium" vs "Load everything = Very High"

