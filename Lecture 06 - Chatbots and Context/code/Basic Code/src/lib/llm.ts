import OpenAI from 'openai';
import { config } from '../config/config.js';
import { REFUSAL_TEXT } from '../config/prompts.js';
import type { ChatTurn } from '../types/chat.types.js';

/**
 * Chapter 05 — the one place that talks to a model.
 *
 * Everything else in this lab (sessions, budgeting, context assembly, guardrails)
 * is provider-agnostic; only this file knows about the network.
 */

/** Chapter 05 §05.3 — what a buffered call reports back. */
export interface ModelResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  model: string;
  finishReason: string;
}

const client = new OpenAI({
  apiKey: config.AI_API_KEY || 'not-needed', // Ollama runs locally and needs none
  baseURL: config.AI_ENDPOINT,
  maxRetries: 0,
  timeout: 60_000,
});

/**
 * Chapter 05 §05.7 — with no provider key the lab runs in OFFLINE mode.
 * The whole pipeline (context assembly, SSE framing, guardrails) still runs end
 * to end against a deterministic stub, so chapters 01-05 are studyable with zero spend.
 */
export const isOffline = (): boolean => config.AI_PROVIDER !== 'ollama' && !config.AI_API_KEY;

/**
 * A deterministic stand-in, NOT a model.
 * It answers from the first retrieved chunk and cites it, which is exactly the
 * behaviour chapter 07 wants — so the verifier has something real to check.
 * The caller can tell it is offline from `usage.model === 'offline-stub'`.
 */
const offlineReply = (messages: ChatTurn[]): string => {
  const joined = messages.map((message) => message.content).join('\n');

  // Compaction request (chapter 03 §03.4) — an extractive stand-in for a summariser.
  if (joined.includes('Summarise the conversation segment')) {
    const segment = messages[messages.length - 1]?.content ?? '';
    return segment
      .split('\n')
      .map((line) => line.trim())
      // Drop the [SEGMENT] marker and any bullet prefixes before re-summarising.
      .filter((line) => line.length > 0 && !line.startsWith('['))
      .map((line) => line.replace(/^-\s*/, ''))
      .slice(0, 6)
      .map((line) => `- ${line.slice(0, 100)}`)
      .join('\n');
  }

  const context = joined.match(/\[CONTEXT\]\n([\s\S]*?)(?:\n\[|$)/)?.[1] ?? '';
  const firstChunk = context.split('\n').find((line) => line.startsWith('['));

  // No evidence retrieved → the calibrated refusal (chapter 07 §07.6).
  if (!firstChunk) return REFUSAL_TEXT;

  const id = firstChunk.slice(1, firstChunk.indexOf(']'));
  const fact = firstChunk.slice(firstChunk.indexOf(']') + 1).trim();
  return `${fact}\nCITATIONS: ${id}`;
};

/** Chapter 05 §05.2 — the buffered path: nothing is visible until generation finishes. */
export const callModel = async (messages: ChatTurn[]): Promise<ModelResult> => {
  const startedAt = Date.now();

  if (isOffline()) {
    const text = offlineReply(messages);
    return {
      text,
      inputTokens: Math.ceil(messages.map((message) => message.content).join('').length / 4),
      outputTokens: Math.ceil(text.length / 4),
      latencyMs: Date.now() - startedAt,
      model: 'offline-stub',
      finishReason: 'stop',
    };
  }

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

/**
 * Chapter 05 §05.1 — the streamed path.
 * Generation is already incremental; this just stops hiding it behind a buffer.
 * The `signal` is what prevents orphaned generation when the client disconnects (§05.9).
 */
export async function* streamModel(messages: ChatTurn[], signal?: AbortSignal): AsyncGenerator<string> {
  if (isOffline()) {
    for (const token of offlineReply(messages).match(/\S+\s*/g) ?? []) {
      await new Promise((resolve) => setTimeout(resolve, 20)); // visible cadence
      yield token;
    }
    return;
  }

  const stream = await client.chat.completions.create(
    {
      model: config.AI_MODEL,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: config.AI_TEMPERATURE,
      max_tokens: config.AI_MAX_TOKENS,
      stream: true,
    },
    { signal },
  );

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    // §05.7 — role-only and usage-only frames arrive with an empty delta.
    if (!delta) continue;
    yield delta;
  }
}
