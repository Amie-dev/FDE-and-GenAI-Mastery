import "dotenv/config";

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Single source of truth for environment configuration.
 * Every other file imports from here; nothing else reads process.env directly.
 */
export const config = {
  port: num(process.env.PORT, 3000),

  /** Neo4j connection (Chapter 03, 04). */
  neo4jUri: process.env.NEO4J_URI || "bolt://localhost:7687",
  neo4jUser: process.env.NEO4J_USER || "neo4j",
  neo4jPassword: process.env.NEO4J_PASSWORD || "password",
  neo4jDatabase: process.env.NEO4J_DATABASE || "neo4j",

  /** GraphRAG retrieval (Chapter 06). */
  vectorIndex: process.env.VECTOR_INDEX || "doc_emb_idx",
  vectorTopK: num(process.env.VECTOR_TOP_K, 5),

  /** Agent memory (Chapter 07). */
  stmWindowSize: num(process.env.STM_WINDOW_SIZE, 6),
  ltmTopK: num(process.env.LTM_TOP_K, 5),
  maxContextTokens: num(process.env.MAX_CONTEXT_TOKENS, 2000),
} as const;