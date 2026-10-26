import { config } from "../config/config";
import type { ModelSpec, PromptPart } from "../types";
import { TIKTOKEN_VERSION, countTokens, resolveEncoding } from "./tokenizerService";

/**
 * Chapter 05 - token accounting: count, budget, cost.
 *
 * These three numbers are what a product manager, a finance team and an on-call engineer
 * will each ask you for - which is why they belong in the codebase and not in a
 * spreadsheet. The count comes from the real tokenizer, and it always travels with the
 * two facts that make it trustworthy: WHICH tokenizer, and whether it is exact (§05.4).
 */

export type TokenizerMeta = {
  name: string;
  version: string;
  encoding: string;
  exact: boolean;
  source: string;
};

/**
 * Which tokenizer produced a number, and how much to trust it.
 * `exact: false` is not a failure - it is the honest answer for a model whose tokenizer
 * is closed (Claude, Gemini), and the number must be labelled an estimate.
 */
export function tokenizerMeta(input?: string): TokenizerMeta {
  const { name, exact, source } = resolveEncoding(input);
  return { name: "js-tiktoken", version: TIKTOKEN_VERSION, encoding: name, exact, source };
}

export type CountResult = TokenizerMeta & { tokens: number };

/** Count one piece of text with the encoding that model really uses. */
export function count(text: string, input?: string): CountResult {
  return { tokens: countTokens(text, input), ...tokenizerMeta(input) };
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
  input?: string,
): (PromptPart & { preview: string; tokens: number })[] {
  return parts.map((part) => ({
    name: part.name,
    tokens: countTokens(part.text, input),
    preview: part.text.slice(0, 60),
  }));
}

/** The model spec a request asked for, or the configured default. */
export function modelFrom(id: unknown): ModelSpec {
  return config.model(typeof id === "string" && id.length > 0 ? id : config.defaultModel);
}
