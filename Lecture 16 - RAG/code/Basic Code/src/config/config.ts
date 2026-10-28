import "dotenv/config";

/** Read a positive number from the environment, falling back when missing or silly. */
function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Single source of truth for environment configuration.
 * Chapter 04: one model, one dimension, used identically at ingest and query time.
 * Chapter 03: chunk size + overlap decide the unit of retrieval.
 */
export const config = {
  port: num(process.env.PORT, 3000),

  openaiApiKey: process.env.OPENAI_API_KEY ?? "",

  /** Embedding model + dimension — must match ingestion and serving (Chapter 04). */
  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  embeddingDims: num(process.env.EMBEDDING_DIMS, 1024),

  /** Chat model used for grounded generation (Chapter 06). */
  chatModel: process.env.CHAT_MODEL ?? "gpt-4o-mini",

  /** Ingestion chunking (Chapter 03). */
  chunkSize: num(process.env.CHUNK_SIZE, 400),
  chunkOverlap: num(process.env.CHUNK_OVERLAP, 80),

  /** Retrieval budget (Chapter 05): keep top-K small so the prompt stays cheap. */
  topK: num(process.env.TOP_K, 4),

  /** Vector namespace — per-tenant isolation in the index (Chapter 05). */
  namespace: process.env.NAMESPACE ?? "policies",
} as const;