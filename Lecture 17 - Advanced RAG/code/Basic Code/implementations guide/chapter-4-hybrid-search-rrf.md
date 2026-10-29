# Chapter 4 — Hybrid Search & RRF (Dense + Lexical Fusion)

**Goal:** Fix dense search's weakness with exact terms by combining dense (meaning) + BM25 (exact terms) using Reciprocal Rank Fusion.
**Notes reference:** `notes/04_Hybrid_Search_and_RRF.md`
**File:** `src/services/hybrid-search.service.ts`
**Order:** Run after Chapter 3.

---

## 4.1 File Details

**`src/services/hybrid-search.service.ts`**

```ts
/**
 * Chapter 04 — Hybrid Search & RRF (Dense + Lexical Fusion)
 *
 * Dense search captures meaning ("what does this mean?").
 * Lexical (BM25) search captures exact terms ("what does this say?").
 * RRF combines ranked lists by position, not score.
 */

import { Candidate } from "./retrieval.service";

export interface HybridRequest {
  query: string;
  topK?: number;
  filter?: Record<string, unknown>;
}

function bm25Scores(query: string, docs: Candidate[]): number[] {
  const qTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const N = docs.length;
  const scores = new Array(docs.length).fill(0);

  qTerms.forEach((term) => {
    const n = docs.filter((d) => d.text.toLowerCase().includes(term)).length;
    const idf = Math.log((N - n + 0.5) / (n + 0.5) + 1);
    docs.forEach((d, i) => {
      const tf = (d.text.toLowerCase().match(new RegExp(term, "g")) || []).length;
      scores[i] += idf * (tf / (tf + 1));
    });
  });

  return scores;
}

function rrf(rankedLists: Candidate[][], k: number): Candidate[] {
  const scoreMap = new Map<string, { rrf: number; doc: Candidate }>();

  rankedLists.forEach((list) => {
    list.forEach((doc, rank) => {
      const existing = scoreMap.get(doc.id) || { rrf: 0, doc };
      existing.rrf += 1 / (k + rank + 1);
      scoreMap.set(doc.id, existing);
    });
  });

  return Array.from(scoreMap.values())
    .sort((a, b) => b.rrf - a.rrf)
    .map((entry) => ({ ...entry.doc, score: entry.rrf }));
}

export function hybridSearch(req: HybridRequest): {
  candidates: Candidate[];
  dense: Candidate[];
  lexical: Candidate[];
} {
  const topK = req.topK ?? 20;
  const rrfK = 60;

  const dense = [...DOCUMENTS]
    .map((d) => ({ ...d, score: denseScore(req.query, d.text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const bm25 = bm25Scores(req.query, DOCUMENTS);
  const lexical = DOCUMENTS
    .map((d, i) => ({ ...d, score: bm25[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const filter = req.filter ?? {};
  const keep = (c: Candidate) =>
    Object.entries(filter).every(([k, v]) => c.metadata[k] === v);

  const denseFiltered = dense.filter(keep);
  const lexicalFiltered = lexical.filter(keep);

  const fused = rrf([denseFiltered, lexicalFiltered], rrfK);
  return { candidates: fused, dense: denseFiltered, lexical: lexicalFiltered };
}

function denseScore(query: string, text: string): number {
  const qWords = query.toLowerCase().split(/\s+/);
  const tWords = text.toLowerCase().split(/\s+/);
  const overlap = qWords.filter((w) => tWords.includes(w)).length;
  return overlap / Math.max(qWords.length, 1);
}

const DOCUMENTS: Candidate[] = [
  {
    id: "doc-1",
    text: "General Return Policy: Eligible products may be returned within 30 days of delivery.",
    score: 0,
    metadata: { category: "general", section: "returns", effectiveFrom: "2024-01-01" },
  },
  {
    id: "doc-2",
    text: "Electronics Return Policy: Electronic products may be returned within 7 days of delivery, subject to inspection.",
    score: 0,
    metadata: { category: "electronics", section: "returns", effectiveFrom: "2024-01-01" },
  },
  {
    id: "doc-3",
    text: "Damaged Product Policy: Customers must report a damaged product within 48 hours of delivery.",
    score: 0,
    metadata: { category: "electronics", section: "damaged", effectiveFrom: "2024-01-01" },
  },
  {
    id: "doc-4",
    text: "Exchange Policy: Eligible products can be exchanged within 7 days.",
    score: 0,
    metadata: { category: "general", section: "exchange", effectiveFrom: "2024-01-01" },
  },
];
```

**Block-by-block:**
- `HybridRequest` — query, topK, and filter (same filter applied to both retrievers per Chapter 04 §4.11).
- `bm25Scores` — minimal BM25: term frequency × inverse document frequency for each query term.
- `rrf` — Reciprocal Rank Fusion: `score = sum(1 / (k + rank + 1))` across both ranked lists. Uses position, not raw score, because cosine and BM25 scores aren't comparable (Chapter 04 §4.4).
- `hybridSearch` — the full flow:
  1. Dense retriever scores + sorts + slices to topK.
  2. Lexical (BM25) retriever scores + sorts + slices to topK.
  3. Same filter applied to both lists (Chapter 04: filters identical on both retrievers).
  4. RRF fuses the two filtered lists into one ranked result.
- `denseScore` — mock cosine similarity for the dense pass.
- Returns `candidates` (fused), plus `dense` and `lexical` separately for debugging/tracing.

---

## 4.2 Commands

```bash
npx ts-node -e "
import { hybridSearch } from './src/services/hybrid-search.service';
const { candidates, dense, lexical } = hybridSearch({
  query: 'AX-204 fast charging',
  topK: 20,
});
console.log('fused:', candidates.map(c => c.id + ':' + c.score.toFixed(3)));
console.log('dense count:', dense.length, '| lexical count:', lexical.length);
"
```

---

## 4.3 What This Implements from the Notes

| Notes concept | Implementation |
|---|---|
| Dense retriever (meaning) | `denseScore` pass |
| Lexical retriever (exact terms) | `bm25Scores` pass |
| Same filter on both | `keep` applied to `dense` and `lexical` |
| RRF by position not score | `rrf` uses `1 / (k + rank + 1)` |
| RRF constant k=60 | `rrfK = 60` |
| Candidates per retriever = 20 | `topK ?? 20` |
