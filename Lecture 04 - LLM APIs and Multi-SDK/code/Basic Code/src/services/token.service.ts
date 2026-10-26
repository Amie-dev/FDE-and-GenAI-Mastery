import { config, PRICING } from '../config/config.js';
import type { ChatMessage, TokenUsage } from '../lib/client.js';

/**
 * Chapter 05 — ~4 characters per token for English prose.
 * A heuristic, not a tokenizer: good enough to budget before you pay for a call.
 */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/** Every chat message also pays for its role markers and separators. */
const MESSAGE_OVERHEAD_TOKENS = 4;

export const countMessageTokens = (messages: ChatMessage[]): number =>
  messages.reduce((total, message) => total + estimateTokens(message.content) + MESSAGE_OVERHEAD_TOKENS, 0);

/**
 * Chapter 05 — context budgeting: refuse the call locally (HTTP 413) instead of
 * paying for a provider-side rejection. The estimate must fit AI_MAX_INPUT_TOKENS.
 */
export const assertWithinBudget = (messages: ChatMessage[]): number => {
  const estimatedInputTokens = countMessageTokens(messages);
  const budget = config.AI_MAX_INPUT_TOKENS;

  if (estimatedInputTokens > budget) {
    throw Object.assign(
      new Error(
        `Estimated ${estimatedInputTokens} input tokens exceeds the budget of ${budget}. ` +
          'Trim the history or raise AI_MAX_INPUT_TOKENS.',
      ),
      { status: 413 },
    );
  }

  return estimatedInputTokens;
};

export interface CostBreakdown {
  currency: 'USD';
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

/**
 * Chapter 04 — token economics: prefill (input) tokens are cheap, decode (output)
 * tokens are expensive. cost = (tokens / 1M) × price-per-1M.
 */
export const computeCost = (usage: TokenUsage, model: string = config.AI_MODEL): CostBreakdown => {
  const rate = PRICING[model] ?? PRICING.default;
  const inputCost = (usage.inputTokens / 1_000_000) * rate.input;
  const outputCost = (usage.outputTokens / 1_000_000) * rate.output;

  return { currency: 'USD', inputCost, outputCost, totalCost: inputCost + outputCost };
};
