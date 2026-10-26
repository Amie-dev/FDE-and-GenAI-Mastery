import { config } from "../config/config";
import type { ModelSpec, PromptPart } from "../types";
import { countTokens } from "./tokenizerService";

/**
 * Chapter 05 - token accounting: count, budget, cost.
 * These three numbers are what a product manager, a finance team and an on-call
 * engineer will each ask you for - which is why they belong in the codebase and
 * not in a spreadsheet.
 */

/** The tokenizer these counts come from, and how much to trust the number (§05.4 warning). */
export const TOKENIZER_META = {
  version: "lecture02-toy-v1",
  exact: false,
  note:
    "Counted with this lecture's toy tokenizer. A real service uses tiktoken / js-tiktoken for OpenAI " +
    "models and asks the provider for closed tokenizers - then labels the number an estimate whenever it " +
    "does not match the provider's `usage`.",
} as const;

export type CountResult = {
  tokens: number;
  exact: boolean;
  tokenizerVersion: string;
  note: string;
};

/** Count one piece of text. `exact: false` means "an estimate - label it as one". */
export function count(text: string): CountResult {
  return {
    tokens: countTokens(text),
    exact: TOKENIZER_META.exact,
    tokenizerVersion: TOKENIZER_META.version,
    note: TOKENIZER_META.note,
  };
}

/** Reserve the output FIRST, then see what is left for the prompt (§05.6). */
export function promptBudget(model: ModelSpec, desiredOutputTokens: number): {
  contextWindow: number;
  outputReserve: number;
  availableForPrompt: number;
} {
  const outputReserve = Math.min(model.maxOutputTokens, desiredOutputTokens);
  return {
    contextWindow: model.contextWindow,
    outputReserve,
    availableForPrompt: model.contextWindow - outputReserve,
  };
}

const round = (value: number): number => Number(value.toFixed(6));

/** Input and output tokens are priced separately (§05.4). */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelSpec,
): { inputUsd: number; outputUsd: number; totalUsd: number } {
  const inputUsd = (inputTokens / 1_000_000) * model.pricePerMillionInput;
  const outputUsd = (outputTokens / 1_000_000) * model.pricePerMillionOutput;
  return { inputUsd: round(inputUsd), outputUsd: round(outputUsd), totalUsd: round(inputUsd + outputUsd) };
}

/** Count a whole prompt part by part, so you can see where the window goes. */
export function countParts(
  parts: { name: PromptPart["name"]; text: string }[],
): (PromptPart & { preview: string })[] {
  return parts.map((part) => ({
    name: part.name,
    tokens: countTokens(part.text),
    preview: part.text.slice(0, 60),
  }));
}

/** The model spec a request asked for, or the configured default. */
export function modelFrom(id: unknown): ModelSpec {
  return config.model(typeof id === "string" && id.length > 0 ? id : config.defaultModel);
}
