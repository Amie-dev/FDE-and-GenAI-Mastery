/**
 * Services barrel export (Chapter 0 — file structure).
 * Each chapter's service is exported from here.
 */

export { chunkText, withBreadcrumb, type Chunk, type ChunkingOptions } from "./chunking.service";
export { retrieve, type RetrievalRequest, type Candidate } from "./retrieval.service";
export { hybridSearch, type HybridRequest } from "./hybrid-search.service";
export { rerank, type RerankRequest, type RerankResult } from "./rerank.service";
export {
  rewriteQuery,
  stepBack,
  routeQuery,
  processQuery,
  type QueryTranslation,
  type RouteDecision,
} from "./query-processing.service";
export {
  assembleContext,
  type ContextChunk,
  type AssembledContext,
} from "./context-engineering.service";
export { inputGuardrail, outputGuardrail, type GuardrailResult } from "./guardrail.service";
export {
  evaluate,
  cragLoop,
  type CRAGEvaluation,
} from "./crag.service";