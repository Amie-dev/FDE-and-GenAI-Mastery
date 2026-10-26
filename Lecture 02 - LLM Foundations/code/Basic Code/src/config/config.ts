import "dotenv/config";
import type { ModelSpec } from "../types";

/**
 * Chapter 05 - the model table every token count and cost estimate is measured
 * against. The prices are illustrative examples, not a quote: always read the
 * provider's own page before you promise anyone a number.
 */
const MODELS: ModelSpec[] = [
  { id: "gpt-4o", contextWindow: 128_000, maxOutputTokens: 16_384, pricePerMillionInput: 2.5, pricePerMillionOutput: 10 },
  { id: "gpt-4o-mini", contextWindow: 128_000, maxOutputTokens: 16_384, pricePerMillionInput: 0.15, pricePerMillionOutput: 0.6 },
  { id: "claude-3-5-sonnet", contextWindow: 200_000, maxOutputTokens: 8_192, pricePerMillionInput: 3, pricePerMillionOutput: 15 },
];

/** Read a number from the environment, falling back when it is missing or silly. */
function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  /** Port the HTTP server listens on. */
  port: num(process.env.PORT, 3000),

  /** d_model - the width of every token vector (Chapters 06-07). */
  dModel: num(process.env.D_MODEL, 32),

  /** The model spec used when a request does not name one. */
  defaultModel: process.env.DEFAULT_MODEL ?? "gpt-4o",

  /** Every model spec the endpoints know about. */
  models: MODELS,

  /** Look a spec up by id, or fail loudly - never guess a context window. */
  model(id: string): ModelSpec {
    const found = MODELS.find((model) => model.id === id);
    if (!found) throw new Error(`Unknown model "${id}". Known models: ${MODELS.map((m) => m.id).join(", ")}`);
    return found;
  },
};
