import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/config";
import { hybridSearch } from "../services/hybrid-search.service";
import { rerank } from "../services/rerank.service";
import { assembleContext } from "../services/context-engineering.service";
import { evaluate, cragLoop } from "../services/crag.service";
import { inputGuardrail, outputGuardrail } from "../services/guardrail.service";
import { processQuery } from "../services/query-processing.service";
import { buildTrace } from "../services/rag-pipeline.service";
import type { RagResponse, RequestTrace } from "../types/index";
import logger from "../middleware/logger";

export interface RagControllerResponse {
  answer: string;
  citations: string[];
  confidence: number;
  trace: RequestTrace;
}

export async function ragQuery(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const { query } = req.body as { query?: string };

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" });
    return;
  }

  const requestId = uuidv4();
  const sessionId = (req.headers["x-session-id"] as string) || uuidv4();

  // --- Chapter 08: Input Guardrails ---
  const input = inputGuardrail(query);
  const safeQuery = input.text;

  // --- Chapter 06: Query Processing ---
  const { translation, route } = processQuery(safeQuery);

  // --- Chapter 04: Hybrid Search + RRF ---
  const hybridReq = {
    query: translation.rewritten,
    topK: config.RETRIEVAL_TOP_K,
  };
  const { candidates, dense, lexical } = hybridSearch(hybridReq);

  // --- Chapter 05: Reranking ---
  const rerankResult = rerank({
    query: translation.rewritten,
    candidates,
    topN: config.RERANK_TOP_N,
  });

  // --- Chapter 08: CRAG evaluation ---
  const crag = evaluate(translation.rewritten, rerankResult.candidates);

  // --- Chapter 07: Context Engineering ---
  const context = assembleContext(rerankResult.candidates, {
    maxTokens: config.MAX_CONTEXT_TOKENS,
    maxChunks: config.MAX_CHUNKS,
  });

  // --- Generation ---
  let answer: string;
  let citations: string[] = [];
  let confidence = 0.5;

  if (crag.sufficient) {
    answer = `Based on the retrieved context: ${rerankResult.candidates
      .map((c) => c.text)
      .join(" ")}`;
    citations = rerankResult.candidates.map((c) => c.id);
    confidence = 0.85;
  } else {
    answer = "I cannot answer that confidently from the available evidence.";
    confidence = 0.2;
  }

  // --- Chapter 08: Output Guardrails ---
  const output = outputGuardrail(answer);

  // --- Build trace (Chapter 08 §8.7) ---
  const latencyMs: Record<string, number> = {
    total: Date.now() - startTime,
    // Individual stage timings would be more granular in production
  };

  const trace = buildTrace({
    requestId,
    sessionId,
    question: query,
    condensedQuery: translation.rewritten,
    filters: {},
    dense: dense.map((d) => ({ id: d.id, score: d.score })),
    lexical: lexical.map((l) => ({ id: l.id, score: l.score })),
    fused: candidates.map((f) => ({ id: f.id, rrf: f.score })),
    droppedByThreshold: [],
    reranked: rerankResult.scores.map((s) => ({ id: s.id, relevance: s.score })),
    contextIds: context.chunks.map((c) => c.source),
    contextTokens: context.totalTokens,
    answer: output.text,
    citations,
    invalidCitations: [],
    refused: !crag.sufficient,
    degraded: rerankResult.degraded,
    latencyMs,
  });

  logger.info({ trace }, "RAG query completed");

  const response: RagControllerResponse = {
    answer: output.text,
    citations,
    confidence,
    trace,
  };

  res.json(response);
}