import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().default("gpt-4.1"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  QDRANT_URL: z.string().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION: z.string().default("policies"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  RERANKER_URL: z.string().default("http://localhost:8000/rerank"),
  RERANKER_MODEL: z.string().default("bge-reranker-v2-m3"),
  RATE_LIMIT_MAX: z.string().default("100").transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default("60000").transform(Number),
  MAX_CONTEXT_TOKENS: z.string().default("4000").transform(Number),
  MAX_CHUNKS: z.string().default("5").transform(Number),
  RETRIEVAL_TOP_K: z.string().default("20").transform(Number),
  RERANK_TOP_N: z.string().default("4").transform(Number),
  RRF_K: z.string().default("60").transform(Number),
  SIMILARITY_THRESHOLD: z.string().default("0.65").transform(Number),
  CRAG_MAX_RETRIES: z.string().default("2").transform(Number),
  CACHE_TTL_MS: z.string().default("300000").transform(Number),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const config: Env = parsed.data;