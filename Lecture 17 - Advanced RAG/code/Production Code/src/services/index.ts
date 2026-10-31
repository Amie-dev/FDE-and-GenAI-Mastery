/**
 * Services barrel export (Chapter 0 — file structure).
 * Each chapter's service is exported from here.
 */

export {
  chunkText,
  withBreadcrumb,
} from "./chunking.service";

export {
  retrieve,
} from "./retrieval.service";

export {
  hybridSearch,
} from "./hybrid-search.service";

export {
  rerank,
} from "./rerank.service";

export {
  rewriteQuery,
  stepBack,
  routeQuery,
  processQuery,
} from "./query-processing.service";

export {
  assembleContext,
} from "./context-engineering.service";

export {
  inputGuardrail,
  outputGuardrail,
} from "./guardrail.service";

export {
  evaluate,
  cragLoop,
} from "./crag.service";

export {
  buildTrace,
} from "./rag-pipeline.service";

// Type re-exports from types/index.ts (single source of truth)
export type {
  RetrievalRequest,
  Candidate,
  HybridRequest,
  RerankRequest,
  RerankResult,
  QueryTranslation,
  RouteDecision,
  ContextChunk,
  AssembledContext,
  GuardrailResult,
  CRAGEvaluation,
  RequestTrace,
  RagResponse,
} from "../types/index";