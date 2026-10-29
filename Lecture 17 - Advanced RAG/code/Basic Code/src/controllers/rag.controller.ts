/**
 * RAG Controller — orchestrates the Advanced RAG pipeline chapter by chapter.
 *
 * Pipeline order (Chapter 01 §1.8):
 * Guard → Query Process → Filter → Retrieve → Fuse → Rerank → Assemble → Generate → Validate
 */

import { Request, Response } from "express";
import {
  inputGuardrail,
  outputGuardrail,
  type GuardrailResult,
} from "../services/guardrail.service";
import { processQuery, type RouteDecision } from "../services/query-processing.service";
import { hybridSearch, type HybridRequest } from "../services/hybrid-search.service";
import { rerank, type RerankResult } from "../services/rerank.service";
import { assembleContext, type AssembledContext } from "../services/context-engineering.service";
import { evaluate, type CRAGEvaluation } from "../services/crag.service";
import { config } from "../config/config";

export interface RagResponse {
  answer: string;
  route: RouteDecision;
  translation: { original: string; rewritten: string };
  rerank: RerankResult;
  context: AssembledContext;
  crag: CRAGEvaluation;
  guardrails: { input: GuardrailResult; output: GuardrailResult };
}

/**
 * POST /rag/query — main Advanced RAG endpoint.
 */
export async function ragQuery(req: Request, res: Response): Promise<void> {
  const { query } = req.body as { query?: string };

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" });
    return;
  }

  // --- Chapter 08: Input Guardrails ---
  const input = inputGuardrail(query);
  const safeQuery = input.text;

  // --- Chapter 06: Query Processing ---
  const { translation, route } = processQuery(safeQuery);

  // --- Chapter 04: Hybrid Search + RRF (uses filter from route decision) ---
  const filter: Record<string, unknown> = {};
  if (route.source === "vector") {
    // No category filter for pure semantic queries
  }
  const hybridReq: HybridRequest = {
    query: translation.rewritten,
    topK: config.topK,
    filter: Object.keys(filter).length ? filter : undefined,
  };
  const { candidates } = hybridSearch(hybridReq);

  // --- Chapter 05: Reranking ---
  const rerankResult = rerank({
    query: translation.rewritten,
    candidates,
    topN: config.rerankTopN,
  });

  // --- Chapter 07: Context Engineering ---
  const context = assembleContext(rerankResult.candidates, {
    maxTokens: config.maxContextTokens,
    maxChunks: config.maxChunks,
  });

  // --- Chapter 01/08: Generation + CRAG Evaluation ---
  const crag = evaluate(translation.rewritten, rerankResult.candidates);

  let answer: string;
  if (crag.sufficient) {
    // Build a simple grounded answer from context
    answer = `Based on the retrieved context: ${rerankResult.candidates
      .map((c) => c.text)
      .join(" ")}`;
  } else {
    answer = "I cannot answer that confidently from the available evidence.";
  }

  // --- Chapter 08: Output Guardrails ---
  const output = outputGuardrail(answer);

  const response: RagResponse = {
    answer: output.text,
    route,
    translation,
    rerank: rerankResult,
    context,
    crag,
    guardrails: { input, output },
  };

  res.json(response);
}