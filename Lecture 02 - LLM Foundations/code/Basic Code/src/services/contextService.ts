import { config } from "../config/config";
import type { PromptPart } from "../types";

/**
 * Chapter 08 - the context window.
 *
 * Capacity is not attention quality (§08.1), and a big window is not free (§08.2):
 * attention is O(N^2 * d_model), the KV cache is O(N * layers * d_model), and the
 * money is linear in tokens. This file makes the cost visible and then decides
 * what to drop when the prompt does not fit.
 */

export type Budget = { window: number; outputReserve: number };

export type FittedPart = PromptPart & { truncated: boolean; dropped: boolean; reason: string | null };

/**
 * Priority order from §08.3, highest first: instructions and tool schemas are kept
 * before the conversation, and history is the first thing to go. The user's own
 * message still outranks retrieved context - drop a document before the question.
 */
const PRIORITY: PromptPart["name"][] = ["system", "tools", "user", "context", "history"];

export type FitResult = {
  available: number;
  usedTokens: number;
  kept: FittedPart[];
  dropped: FittedPart[];
  note: string;
};

/**
 * Fit the prompt into the window, in priority order, and RECORD what was lost.
 * Silent truncation is the worst outcome: it produces "the AI forgot what I said"
 * with no evidence (§08.3).
 */
export function fitToWindow(parts: PromptPart[], budget: Budget): FitResult {
  const available = budget.window - budget.outputReserve;
  const kept: FittedPart[] = [];
  const dropped: FittedPart[] = [];
  let used = 0;

  for (const name of PRIORITY) {
    const part = parts.find((candidate) => candidate.name === name);
    if (!part) continue;

    const remaining = available - used;
    if (remaining <= 0) {
      dropped.push({ ...part, truncated: false, dropped: true, reason: "no room left in the window" });
      continue;
    }
    if (part.tokens <= remaining) {
      kept.push({ ...part, truncated: false, dropped: false, reason: null });
      used += part.tokens;
      continue;
    }

    // The part fits only partly: keep the head, log the tail.
    kept.push({ ...part, tokens: remaining, truncated: true, dropped: false, reason: "truncated to fit" });
    dropped.push({ ...part, tokens: part.tokens - remaining, truncated: true, dropped: true, reason: "the tail that did not fit" });
    used += remaining;
  }

  return {
    available,
    usedTokens: used,
    kept,
    dropped,
    note: "Priority order: system > tools > user > context > history. Dropped tokens are reported, never swallowed.",
  };
}

/** Cost 1 of §08.2: attention work grows with the SQUARE of the sequence length. */
export function attentionOps(tokens: number, dModel = config.dModel): number {
  return tokens * tokens * dModel;
}

export type KvCache = {
  tokens: number;
  layers: number;
  dModel: number;
  bytesPerValue: number;
  bytes: number;
  megabytes: number;
};

/**
 * Cost 2 of §08.2: every concurrent request holds its own KV cache, which is
 * what limits batch size - and therefore throughput - on a serving box.
 * x2 because there is a key cache and a value cache.
 */
export function kvCache(
  tokens: number,
  options: { layers?: number; dModel?: number; bytesPerValue?: number } = {},
): KvCache {
  const layers = options.layers ?? 12;
  const dModel = options.dModel ?? config.dModel;
  const bytesPerValue = options.bytesPerValue ?? 2; // fp16
  const bytes = 2 * layers * tokens * dModel * bytesPerValue;

  return {
    tokens,
    layers,
    dModel,
    bytesPerValue,
    bytes,
    megabytes: Number((bytes / 1024 / 1024).toFixed(4)),
  };
}
