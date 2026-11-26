import { RequestTrace } from "../types/index";

/**
 * Chapter 08 — Build a full request trace for observability (§8.7).
 * Every request and every eval row carries its fingerprint so that
 * "recall dropped 8 points on 12 October" becomes *"the corpus changed,
 * the prompt did not"* in one query.
 */
export function buildTrace(
  req: {
    requestId: string;
    sessionId: string;
    question: string;
    condensedQuery: string;
    filters: Record<string, unknown>;
    dense: Array<{ id: string; score: number }>;
    lexical: Array<{ id: string; score: number }>;
    fused: Array<{ id: string; rrf: number }>;
    droppedByThreshold: string[];
    reranked: Array<{ id: string; relevance: number }>;
    contextIds: string[];
    contextTokens: number;
    answer: string;
    citations: string[];
    invalidCitations: number[];
    refused: boolean;
    degraded: boolean;
    latencyMs: Record<string, number>;
  }
): RequestTrace {
  return {
    requestId: req.requestId,
    sessionId: req.sessionId,
    fingerprint: {
      query: req.question,
      model: process.env.OPENAI_MODEL || "gpt-4.1",
      embedder: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
      corpus: "policies",
    },
    question: req.question,
    condesedxQuery: req.condensedQuery,
    filters: req.filters,
    dense: req.dense,
    lexical: req.lexical,
    fused: req.fused,
    droppedByThreshold: req.droppedByThreshold,
    reranked: req.reranked,
    contextIds: req.contextIds,
    contextTokens: req.contextTokens,
    answer: req.answer,
    citations: req.citations,
    invalidCitations: req.invalidCitations,
    refused: req.refused,
    degraded: req.degraded,
    latencyMs: req.latencyMs,
  };
}