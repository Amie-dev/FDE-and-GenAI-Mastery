import OpenAI from 'openai';
import { config } from '../config/config.js';
import type { ChatTurn } from '../types/prompt.types.js';

/**
 * Chapter 09 — what every call must report back, so the six metrics can be computed.
 */
export interface ModelResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  model: string;
  finishReason: string;
}

/** One client per process, built at boot. `maxRetries: 0` keeps the call honest. */
const client = new OpenAI({
  apiKey: config.AI_API_KEY || 'not-needed', // Ollama runs locally and needs none
  baseURL: config.AI_ENDPOINT,
  maxRetries: 0,
  timeout: 30_000,
});

/**
 * Chapter 06 §06.8 — we send a `messages` array and let the provider apply the
 * model's own chat template. Sending a pre-templated string instead is the
 * "double templating" bug, which is why `template.service.ts` renders templates
 * for inspection only.
 */
export const callModel = async (messages: ChatTurn[]): Promise<ModelResult> => {
  // Chapter 08 — fail with a clear reason instead of a confusing 401 from the provider.
  if (config.AI_PROVIDER !== 'ollama' && !config.AI_API_KEY) {
    throw Object.assign(
      new Error(`AI_PROVIDER=${config.AI_PROVIDER} requires its API key in .env. /api/lab/preview and /api/audit work without one.`),
      { status: 503 },
    );
  }

  const startedAt = Date.now();

  const response = await client.chat.completions.create({
    model: config.AI_MODEL,
    messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: config.AI_TEMPERATURE,
    max_tokens: config.AI_MAX_TOKENS,
  });

  const choice = response.choices[0];

  return {
    text: choice?.message?.content?.trim() ?? '',
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - startedAt,
    model: response.model ?? config.AI_MODEL,
    finishReason: choice?.finish_reason ?? 'unknown',
  };
};
