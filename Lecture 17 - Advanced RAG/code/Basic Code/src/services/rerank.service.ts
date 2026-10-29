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
  degraded: boolean;   // true if we fell back to fused order
  fallbackReason?: string;
}

/**
 * Cross-encoder mock: jointly scores (query, document) more accurately
 * than independent embeddings. Returns a relevance score 0..1.
 */
function crossEncoderScore(query: string, text: string): number {
  const qWords = new Set(query.toLowerCase().split(/\s+/));
  const tWords = text.toLowerCase().split(/\s+/);
  const matchCount = tWords.filter((w) => qWords.has(w)).length;
  const exactPhrase = text.toLowerCase().includes(query.toLowerCase()) ? 0.3 : 0;
  return Math.min(matchCount / Math.max(qWords.size, 1) + exactPhrase, 1);
}

/**
 * Rerank candidates with a cross-encoder. On timeout/error, degrade to
 * the fused order (Chapter 05 §5.10 graceful degradation).
 */
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
    // Graceful degradation: fall back to the fused order
    return {
      candidates: req.candidates.slice(0, topN),
      degraded: true,
      fallbackReason: err instanceof Error ? err.message : "reranker error",
    };
  }
}