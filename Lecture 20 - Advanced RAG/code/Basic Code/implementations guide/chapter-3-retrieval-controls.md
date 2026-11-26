# Chapter 3 — Retrieval Controls (Top-K, Threshold, Filters)

**Goal:** Make retrieval a bounded, calibrated decision: how many candidates (K), how weak a match is accepted (threshold), which documents are eligible (filter).
**Notes reference:** `notes/03_Retrieval_Controls.md`
**File:** `src/services/retrieval.service.ts`
**Order:** Run after Chapter 2.

---

## 3.1 File Details

**`src/services/retrieval.service.ts`**

```ts
/**
 * Chapter 03 — Retrieval Controls (Top-K, Threshold, Filters)
 *
 * Bounded retrieval request: how many candidates (K), how weak a match
 * may be (threshold), and which documents are eligible (filter).
 */

export interface RetrievalRequest {
  query: string;
  topK?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
  namespace?: string;
}

export interface Candidate {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
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

function similarity(query: string, text: string): number {
  const qWords = query.toLowerCase().split(/\s+/);
  const tWords = text.toLowerCase().split(/\s+/);
  const overlap = qWords.filter((w) => tWords.includes(w)).length;
  return overlap / Math.max(qWords.length, 1);
}

export function retrieve(req: RetrievalRequest): {
  candidates: Candidate[];
  trace: { filter: Record<string, unknown> | undefined; returned: number; underK: boolean };
} {
  let results = DOCUMENTS.map((d) => ({
    ...d,
    score: similarity(req.query, d.text),
  }));

  if (req.filter) {
    results = results.filter((c) => {
      return Object.entries(req.filter).every(([k, v]) => c.metadata[k] === v);
    });
  }

  results.sort((a, b) => b.score - a.score);

  const threshold = req.threshold ?? 0;
  results = results.filter((c) => c.score >= threshold);

  const topK = req.topK ?? 20;
  const underK = results.length < topK;
  results = results.slice(0, topK);

  return {
    candidates: results,
    trace: {
      filter: req.filter,
      returned: results.length,
      underK,
    },
  };
}
```

**Block-by-block:**
- `RetrievalRequest` — the five-field request from Chapter 03 §3.1: query, topK, threshold, filter, namespace.
- `Candidate` — one retrieved result: id, text, similarity score, metadata.
- `DOCUMENTS` — in-memory substitute for a vector store (Qdrant/Pinecone in production). Contains the lecture's three policy documents.
- `similarity` — fake cosine approximation so the example runs without an embedding API.
- `retrieve` — the five decisions applied in order:
  1. Score every document against the query.
  2. **Filter** — keep only documents matching `req.filter` (e.g. `{ category: "electronics" }`).
  3. **Sort** — highest score first.
  4. **Threshold** — drop any candidate below `req.threshold` (rejects weak matches).
  5. **Top-K** — keep at most `req.topK` results; records `underK` if fewer returned.
- `trace` — logs the filter expression, count returned, and whether we went under-K (Chapter 03 §3.11 observability).

---

## 3.2 Commands

```bash
npx ts-node -e "
import { retrieve } from './src/services/retrieval.service';
const { candidates, trace } = retrieve({
  query: 'damaged headphones return',
  topK: 3,
  threshold: 0.1,
  filter: { category: 'electronics' },
});
console.log('trace:', trace);
console.log('candidates:', candidates.map(c => c.id + ':' + c.text));
"
```

---

## 3.3 What This Implements from the Notes

| Notes concept | Implementation |
|---|---|
| Five-field retrieval request | `RetrievalRequest` (query, topK, threshold, filter, namespace) |
| Top-K bounds how many | `topK` + `results.slice(0, topK)` |
| Threshold rejects weak matches | `threshold` + `filter(score >= threshold)` |
| Filter decides eligibility | `req.filter` applied to metadata |
| Filter trace for observability | returned `trace` object |
