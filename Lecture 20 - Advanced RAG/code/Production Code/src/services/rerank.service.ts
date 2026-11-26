import { Candidate, RerankRequest, RerankResult } from "../types/index";
import { config } from "../config/config";

function crossEncoderScore(query: string, text: string): number {
  const qWords = new Set(query.toLowerCase().split(/\s+/));
  const tWords = text.toLowerCase().split(/\s+/);
  const matchCount = tWords.filter((w) => qWords.has(w)).length;
  const exactPhrase = text.toLowerCase().includes(query.toLowerCase()) ? 0.3 : 0;
  return Math.min(matchCount / Math.max(qWords.size, 1) + exactPhrase, 1);
}

export function rerank(req: RerankRequest): RerankResult {
  const topN = req.topN ?? config.RERANK_TOP_N;

  try {
    const scored = req.candidates.map((c) => ({
      ...c,
      score: crossEncoderScore(req.query, c.text),
    }));

    scored.sort((a, b) => b.score - a.score);

    const result: Candidate[] = scored.slice(0, topN);

    return {
      candidates: result,
      degraded: false,
      scores: scored.map((s) => ({ id: s.id, score: s.score })),
    };
  } catch (err) {
    return {
      candidates: req.candidates.slice(0, topN),
      degraded: true,
      fallbackReason: err instanceof Error ? err.message : "reranker error",
      scores: req.candidates.map((c) => ({ id: c.id, score: c.score })),
    };
  }
}