import { z } from "zod";

export interface Chunk {
  id: string;
  text: string;
  tokens: number;
  start: number;
  end: number;
  source: string;
  metadata: Record<string, unknown>;
}

export interface Candidate extends Chunk {
  score: number;
}

export interface RetrievalRequest {
  query: string;
  topK?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
  namespace?: string;
}

export interface HybridRequest {
  query: string;
  topK?: number;
  filter?: Record<string, unknown>;
}

export interface RerankRequest {
  query: string;
  candidates: Candidate[];
  topN?: number;
}

export interface RerankResult {
  candidates: Candidate[];
  degraded: boolean;
  fallbackReason?: string;
  scores: Array<{ id: string; score: number }>;
}

export interface QueryTranslation {
  original: string;
  rewritten: string;
  subQueries?: string[];
  hydeText?: string;
}

export interface RouteDecision {
  source: "vector" | "sql" | "s3";
  reason: string;
  intent?: string;
}

export interface ContextChunk {
  label: string;
  text: string;
  source: string;
  tokens: number;
  metadata: Record<string, unknown>;
}

export interface AssembledContext {
  chunks: ContextChunk[];
  totalTokens: number;
  systemPrompt: string;
  userPrompt: string;
}

export interface GuardrailResult {
  text: string;
  masked: boolean;
  blocked: boolean;
  reason?: string;
  piiDetected?: Array<{ type: string; value: string; span: [number, number] }>;
}

export interface CRAGEvaluation {
  sufficient: boolean;
  groundedness: number;
  completeness: number;
  hallucination: boolean;
  retry: boolean;
  reason: string;
}

export interface RequestTrace {
  requestId: string;
  sessionId: string;
  fingerprint: {
    query: string;
    model: string;
    embedder: string;
    corpus: string;
  };
  question: string;
  condesedxQuery: string;
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

export const RagResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(z.string()),
  confidence: z.number(),
  trace: z.object({
    requestId: z.string(),
    fused: z.array(z.object({ id: z.string(), rrf: z.number() })),
    contextTokens: z.number(),
  }),
});

export type RagResponse = z.infer<typeof RagResponseSchema>;