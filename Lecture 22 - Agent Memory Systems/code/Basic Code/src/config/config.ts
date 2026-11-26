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

  /** STM: how many recent turns the sliding window keeps (Chapter 2). */
  stmWindowSize: num(process.env.STM_WINDOW_SIZE, 6),

  /** LTM: how many memories to retrieve per query (Chapter 4). */
  ltmTopK: num(process.env.LTM_TOP_K, 5),

  /** Context budget: max rough tokens sent to the LLM per request (Chapter 4). */
  maxContextTokens: num(process.env.MAX_CONTEXT_TOKENS, 2000),

  /** Fact extraction: only store facts at or above this confidence (Chapter 3). */
  factConfidenceThreshold: Number(process.env.FACT_CONFIDENCE_THRESHOLD ?? "0.7"),

  /** Eviction: memories below this score are candidates for removal (Chapter 5). */
  evictionScoreThreshold: num(process.env.EVICTION_SCORE_THRESHOLD, 5),
} as const;
