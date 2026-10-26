import OpenAI from 'openai';
import { config } from '../config/config.js';
import type { ChatTurn, Usage } from '../types/streaming.types.js';

/**
 * Chapter 01 §01.5 — the one place that generates text.
 *
 * This file contains ONE generation loop and nothing else. The buffered path and
 * the streamed path differ only in how the caller consumes it:
 *
 *   buffered  →  for await (…) full += piece      (Chapter 07 §07.1)
 *   streamed  →  yield piece                      (Chapter 07 §07.2)
 *
 * Everything downstream (the pump, the transports, the codec) is provider-agnostic;
 * only this file knows about the network.
 */

const client = new OpenAI({
  apiKey: config.AI_API_KEY || 'not-needed', // Ollama runs locally and needs none
  baseURL: config.AI_ENDPOINT,
  maxRetries: 0,
  timeout: 60_000,
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Chapter 01 §01.5 / §01.7 — with no provider key the lab runs in OFFLINE mode.
 * The whole pipeline (the pump, both transports, the codec, the metrics) still
 * runs end to end against a deterministic stub, so the notes are studyable with
 * zero spend.
 */
export const isOffline = (): boolean => config.AI_PROVIDER !== 'ollama' && !config.AI_API_KEY;

/**
 * A deterministic stand-in, NOT a model.
 *
 * It deliberately contains 1-, 2-, 3- and 4-byte UTF-8 characters (`A`, `é`, `₹`, `😀`)
 * so the codec endpoints have real material to split (chapter 04 §04.4), and it is
 * split into word-sized deltas so you can see that a delta is not a token.
 */
const offlineReply = (message: string): string =>
  'Streaming changes delivery, not generation. ' +
  'The model emits one token at a time and the backend forwards it without buffering. ' +
  'Multi-byte safety matters: ₹500, café, naïve, 日本語 and 😀. ' +
  `You asked: "${message.slice(0, 60)}".`;

/**
 * Chapter 01 §01.3 — the cadence the application cannot change:
 * a one-off PREFILL delay (which sets TTFT), then serial DECODE steps (which set TPS).
 */
const offlineDeltas = async function* (message: string): AsyncGenerator<string> {
  await sleep(config.OFFLINE_TTFT_MS); // prefill — the parallel pass over the prompt
  for (const piece of offlineReply(message).match(/\S+\s*/g) ?? []) {
    await sleep(config.OFFLINE_ITL_MS); // one decode step per piece
    yield piece;
  }
};

/**
 * Chapter 07 §07.2 — the streaming service: a handle to a time-series, not a value.
 *
 * It does not buffer, join or assemble. It exposes deltas, and it fills `usage`
 * when the provider finally reports it (chapter 09 §09.5 — usage is not known
 * until generation ends).
 *
 * The `signal` is what stops orphaned generation when the client disconnects
 * (chapter 06 §06.6).
 */
export async function* providerStream(
  messages: ChatTurn[],
  usage: Usage,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (isOffline()) {
    usage.promptTokens = estimate(messages.map((turn) => turn.content).join('\n'));
    let completion = '';
    for await (const delta of offlineDeltas(messages[messages.length - 1]?.content ?? '')) {
      completion += delta;
      yield delta;
    }
    usage.completionTokens = estimate(completion);
    return;
  }

  const stream = await client.chat.completions.create(
    {
      model: config.AI_MODEL,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: config.AI_TEMPERATURE,
      max_tokens: config.AI_MAX_TOKENS,
      stream: true,
      // Chapter 09 §09.5 — ask for usage in the final frame, then reconcile.
      stream_options: { include_usage: true },
    },
    { signal },
  );

  for await (const chunk of stream) {
    if (chunk.usage) {
      usage.promptTokens = chunk.usage.prompt_tokens;
      usage.completionTokens = chunk.usage.completion_tokens;
    }
    const delta = chunk.choices[0]?.delta?.content ?? '';
    // Chapter 02 §02.4 — the first frame often carries an empty delta (role only),
    // and the usage frame has no choices at all. Neither is text.
    if (!delta) continue;
    yield delta;
  }
}

/**
 * Chapter 09 §09.5 — the ±10-15% estimator: characters ÷ average chars-per-token.
 * Good enough for live progress and in-stream budgeting; reconcile with `usage`
 * at the end and never let a missing usage break the ledger.
 */
export const estimate = (text: string): number => Math.ceil(text.length / 4);
