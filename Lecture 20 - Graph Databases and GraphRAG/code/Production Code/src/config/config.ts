import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("production"),
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),

  NEO4J_URI: z.string().url().default("bolt://localhost:7687"),
  NEO4J_USER: z.string().default("neo4j"),
  NEO4J_PASSWORD: z.string().min(1).default("password"),
  NEO4J_DATABASE: z.string().default("neo4j"),

  VECTOR_INDEX: z.string().default("doc_emb_idx"),
  VECTOR_TOP_K: z.coerce.number().min(1).max(100).default(5),
  VECTOR_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
  MAX_GRAPH_HOPS: z.coerce.number().min(1).max(5).default(2),

  STM_WINDOW_SIZE: z.coerce.number().min(1).default(6),
  LTM_TOP_K: z.coerce.number().min(1).default(5),
  MAX_CONTEXT_TOKENS: z.coerce.number().min(100).default(2000),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),

  PROMETHEUS_PORT: z.coerce.number().default(9090),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
});

type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const config: Env = parsed.data;