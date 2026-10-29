# Chapter 5 — Reranking (Two-Stage Retrieval)

**Goal:** Separate finding candidates (stage 1, fast) from ranking candidates (stage 2, accurate cross-encoder).
**Notes reference:** `notes/05_Reranking_Two_Stage_Retrieval.md`
**File:** `src/services/rerank.service.ts`
**Order:** Run after Chapter 4.

---

## 5.1 File Details

**`src/services/rerank.service.ts`**

```ts
/**
 * Chapter 05 — Reranking (Two-Stage Retrieval)
 *
 * Stage 1: bi-encoder (fast, approximate) retrieves wide candidates.
 * Stage 2: cross-encoder (slow, accurate) re-orders the top-N jointly
 * over (query, document). Always has a fallback to the fused order.
 */

import { Candidate } from "./retrieval.service";

export interface RerankRequest {
  query: string;
  candidates: Candidate[];
  topN?: number;
}

export interface RerankResult {
  candidates: Candidate[];
  degraded: boolean;
  fallbackReason?: string;
}

function crossEncoderScore(query: string, text: string): number {
  const qWords = new Set(query.toLowerCase().split(/\s+/));
  const tWords = text.toLowerCase().split(/\s+/);
  const matchCount = tWords.filter((w) => qWords.has(w)).length;
  const exactPhrase = text.toLowerCase().includes(query.toLowerCase()) ? 0.3 : 0;
  return Math.min(matchCount / Math.max(qWords.size, 1) + exactPhrase, 1);
}

export function rerank(req: RerankRequest): RerankResult {
  const topN = req.topN ?? 4;

  try {
    const scored = req.candidates.map((c) => ({
      ...c,
      score: crossEncoderScore(req.query, c.text),
    }));

    scored.sort((a, b) => b.score - a.score);

    return {
      candidates: scored.slice(0, topN),
      degraded: false,
    };
  } catch (err) {
    return {
      candidates: req.candidates.slice(0, topN),
      degraded: true,
      fallbackReason: err instanceof Error ? err.message : "reranker error",
    };
  }
}
```

**Block-by-block:**
- `RerankRequest` — query, the candidate list from stage 1, and `topN` (how many to return after reranking).
- `RerankResult` — reranked candidates, plus `degraded` flag (true if we fell back to fused order) and an optional reason.
- `crossEncoderScore` — mock cross-encoder: jointly scores (query, document) by counting shared words plus an exact-phrase bonus. More accurate than independent embeddings (Chapter 05 §5.2).
- `rerank` — the stage-2 logic:
  1. Scores each candidate with the cross-encoder.
  2. Sorts by the new score (re-orders, does not re-retrieve).
  3. Slices to `topN` (e.g. 20 → 4).
  4. On any error, degrades gracefully: returns the original fused order with `degraded: true` (Chapter 05 §5.10 graceful degradation — never let the optional stage break the request).

---

## 5.2 Commands

```bash
npx ts-node -e "
import { rerank } from './src/services/rerank.service';
import { Candidate } from './src/services/retrieval.service';

const candidates: Candidate[] = [
  { id: 'd1', text: 'General Return Policy: 30 days', score: 0.94, metadata: {} },
  { id: 'd2', text: 'Electronics Return Policy: 7 days', score: 0.89, metadata: {} },
  { id: 'd3', text: 'Damaged Product Policy: 48 hours', score: 0.85, metadata: {} },
];

const result = rerank({ query: 'damaged headphones after 10 days', candidates, topN: 3 });
console.log('degraded:', result.degraded);
console.log('order:', result.candidates.map(c => c.id + ':' + c.text));
"
```

---

## 5.3 What This Implements from the Notes

| Notes concept | Implementation |
|---|---|
| Retrieve wide, rerank narrow | `topN` slices 20 → 4 |
| Cross-encoder joint scoring | `crossEncoderScore(query, text)` |
| Re-ordering, not re-retrieval | sorts existing candidates, doesn't fetch new ones |
| Graceful degradation | `degraded: true` + fallback to fused order on error |
| Rerank score not probability | used only for ordering, not shown as confidence |
