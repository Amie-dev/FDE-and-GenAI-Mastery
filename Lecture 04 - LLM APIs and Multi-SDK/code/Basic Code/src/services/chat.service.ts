import type { SlopReport } from '../guards/slop.guard.js';
import type { ChatMessage, TokenUsage } from '../lib/client.js';
import type { TelemetryRecord } from '../utils/telemetry.js';
import { recordTelemetry } from '../utils/telemetry.js';
import { getProvider } from '../lib/client.js';
import { withRetry } from '../lib/retry.js';
import { assertWithinBudget, computeCost, type CostBreakdown } from './token.service.js';
import { inspect } from '../guards/slop.guard.js';

export interface ChatInput {
  system: string;
  message: string;
  history: ChatMessage[];
}

export interface ChatOutput {
  answer: string;
  provider: string;
  model: string;
  latencyMs: number;
  usage: TokenUsage;
  estimatedInputTokens: number;
  cost: CostBreakdown;
  slop: SlopReport;
  telemetry: TelemetryRecord;
}

/**
 * Chapter 03 — one place builds the message array, so the role boundary can never
 * drift between endpoints: instructions in `system`, untrusted data in `user`.
 */
export const buildMessages = ({ system, message, history }: ChatInput): ChatMessage[] => [
  { role: 'system', content: system },
  ...history,
  { role: 'user', content: message },
];

/**
 * The whole lecture in one function:
 *   build messages (03) → budget them (05) → call the active provider with retry (06 + 07)
 *   → price the result (04) → screen the answer (09) → log the ledger (04 + 08).
 */
export const chat = async (input: ChatInput): Promise<ChatOutput> => {
  const messages = buildMessages(input);

  const estimatedInputTokens = assertWithinBudget(messages); // chapter 05

  const result = await withRetry(() => getProvider().chat(messages), 'chat'); // chapter 06 + 07

  if (!result.text) {
    throw Object.assign(new Error('Provider returned an empty completion.'), { status: 502 });
  }

  const cost = computeCost(result.usage, result.model); // chapter 04
  const slop = inspect(result.text); // chapter 09

  const telemetry = recordTelemetry({
    provider: result.provider,
    model: result.model,
    latencyMs: result.latencyMs,
    usage: result.usage,
    estimatedInputTokens,
    cost,
    slop,
  });

  return {
    answer: result.text,
    provider: result.provider,
    model: result.model,
    latencyMs: result.latencyMs,
    usage: result.usage,
    estimatedInputTokens,
    cost,
    slop,
    telemetry,
  };
};
