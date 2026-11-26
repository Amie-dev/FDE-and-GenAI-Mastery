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
import {
  buildProvenance,
  checkAbstention,
  verifyCitations,
  ABSTENTION_MESSAGE,
  type AbstentionDecision,
  type ChunkProvenance,
  type CitationVerificationResult,
} from "../services/provenance.service";
import { config } from "../config/config";

export interface RagResponse {
  answer: string;
  route: RouteDecision;
  translation: { original: string; rewritten: string };
  rerank: RerankResult;
  context: AssembledContext;
  crag: CRAGEvaluation;
  provenance: ChunkProvenance[];
  citationCheck: CitationVerificationResult;
  abstention: AbstentionDecision;
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

  // --- Chapter 01/08/09: CRAG + Provenance + Calibrated Abstention ---
  const crag = evaluate(translation.rewritten, rerankResult.candidates);
  const provenance = rerankResult.candidates.map(buildProvenance);
  let abstention = checkAbstention(rerankResult.candidates, crag, config.abstentionThreshold);

  let answer: string;
  let citationCheck: CitationVerificationResult;

  if (abstention.abstained) {
    answer = abstention.message ?? ABSTENTION_MESSAGE;
    citationCheck = { ok: true, citedIndices: [], danglingCitations: [], reason: "Abstained — no claims emitted" };
  } else {
    const citedSnippets = rerankResult.candidates
      .map((c, idx) => `[${idx + 1}] ${c.text}`)
      .join(" ");
    answer = `Based on the retrieved context: ${citedSnippets}`;
    citationCheck = verifyCitations(answer, rerankResult.candidates);
    if (!citationCheck.ok) {
      abstention = {
        abstained: true,
        topScore: abstention.topScore,
        threshold: abstention.threshold,
        reason: citationCheck.reason ?? "Citation verification failed",
        message: ABSTENTION_MESSAGE,
      };
      answer = ABSTENTION_MESSAGE;
    }
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
    provenance,
    citationCheck,
    abstention,
    guardrails: { input, output },
  };

  res.json(response);
}