import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
  llmModel: process.env.LLM_MODEL || "gpt-3.5-turbo",
  vectorStore: process.env.VECTOR_STORE || "qdrant",

  // Chapter 03: Retrieval Controls defaults
  topK: 20,        // candidates to retrieve
  kCtx: 4,         // chunks to send to the prompt
  threshold: 0.65, // similarity floor

  // Chapter 04: Hybrid Search + RRF defaults
  rrfK: 60,        // RRF constant

  // Chapter 05: Reranking defaults
  rerankN: 20,     // candidates to rerank
  rerankTopN: 4,   // final chunks after rerank

  // Chapter 07: Context Engineering defaults
  maxContextTokens: 3000,
  maxChunks: 5,
} as const;