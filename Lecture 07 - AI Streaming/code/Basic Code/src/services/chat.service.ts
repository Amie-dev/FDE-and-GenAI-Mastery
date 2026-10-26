import { randomUUID } from 'node:crypto';
import { PUMP_POLICY, READING_TPS } from '../config/config.js';
import { estimate, providerStream } from '../lib/llm.js';
import type {
  ChatTurn,
  Conversation,
  FinishReason,
  PersistedTurn,
  StreamMetrics,
  Usage,
} from '../types/streaming.types.js';
import { appendUserTurn, loadOrCreate, toMessages, upsertAssistantTurn } from './conversation.service.js';
import { recordStream } from './metrics.service.js';
import { pump, type PumpResult } from './pump.service.js';

/**
 * Chapter 07 §07.4 — the orchestrator.
 *
 * It exposes ONE generation loop (`runStream`) and two ways to consume it:
 * buffered (accumulate) and streamed (forward). Everything that differs between
 * the two is in the caller, exactly as chapter 01 §01.5 claims.
 */

/** Chapter 09 §09.3 — the live state of one turn, created per request. */
export interface LiveTurn {
  conversation: Conversation;
  messageId: string;
  messages: ChatTurn[];
  /** Chapter 09 §09.2 — the buffer lives on the REQUEST, never on the service. */
  buffer: string[];
  /** Chapter 09 §09.5 — filled by the provider at the end of generation. */
  usage: Usage;
  startedAt: number;
  firstTokenAt: number | null;
  lastAt: number;
  gapTotalMs: number;
  deltas: number;
}

/**
 * Chapter 09 §09.3 — record the user turn BEFORE calling the model (durability),
 * and generate the assistant `messageId` before streaming so persistence is
 * idempotent (chapter 09 §09.6).
 */
export const prepareTurn = (conversationId: string, message: string): LiveTurn => {
  const conversation = loadOrCreate(conversationId);
  appendUserTurn(conversation, message);

  return {
    conversation,
    messageId: randomUUID(),
    messages: toMessages(conversation),
    buffer: [],
    usage: { promptTokens: 0, completionTokens: 0 },
    startedAt: Date.now(),
    firstTokenAt: null,
    lastAt: Date.now(),
    gapTotalMs: 0,
    deltas: 0,
  };
};

/**
 * Chapter 07 §07.4 — the streaming service: forward only.
 *
 * The only extra work is the side-channel buffer, which is an *observer* of the
 * stream, not a terminator of it (chapter 07 §07.5): the same delta goes to the
 * client (latency path) and to the buffer (correctness path).
 */
export async function* runStream(turn: LiveTurn, signal?: AbortSignal): AsyncGenerator<string> {
  for await (const delta of providerStream(turn.messages, turn.usage, signal)) {
    const now = Date.now();
    if (turn.firstTokenAt === null) turn.firstTokenAt = now;
    else turn.gapTotalMs += now - turn.lastAt;

    turn.lastAt = now;
    turn.deltas += 1;

    turn.buffer.push(delta); // correctness path — assembled once, at the end
    yield delta; // latency path — forwarded immediately
  }
}

/** Chapter 03 §03.5 — build the row from what the stream actually did. */
const toMetrics = (
  turn: LiveTurn,
  transport: StreamMetrics['transport'],
  finishReason: FinishReason,
  result: { frames: number; chars: number },
): StreamMetrics => {
  const totalMs = Date.now() - turn.startedAt;
  const ttftMs = turn.firstTokenAt === null ? null : turn.firstTokenAt - turn.startedAt;
  const itlMs = turn.deltas > 1 ? Math.round(turn.gapTotalMs / (turn.deltas - 1)) : null;
  const tps = itlMs ? Math.round(1000 / itlMs) : null;

  return {
    at: Date.now(),
    conversationId: turn.conversation.conversationId,
    transport,
    ttftMs,
    itlMs,
    tps,
    totalMs,
    frames: result.frames,
    chars: result.chars,
    charsPerFrame: result.frames ? Math.round(result.chars / result.frames) : 0,
    promptTokens: turn.usage.promptTokens,
    completionTokens: turn.usage.completionTokens || estimate(turn.buffer.join('')),
    finishReason,
    aborted: finishReason === 'aborted',
    fasterThanReading: tps !== null && tps >= READING_TPS,
  };
};

/**
 * Chapter 09 §09.6 — ONE write per exchange, plus the metrics row.
 * Chapter 09 §09.4 — `aborted` is not an error: the partial text is kept and
 * flagged, because the user already read it.
 */
export const finaliseTurn = (
  turn: LiveTurn,
  transport: StreamMetrics['transport'],
  finishReason: FinishReason,
  result: { frames: number; chars: number },
): PersistedTurn => {
  const status = finishReason === 'aborted' ? 'interrupted' : finishReason === 'length' ? 'length' : 'complete';

  const persisted = upsertAssistantTurn(turn.conversation, {
    messageId: turn.messageId,
    content: turn.buffer.join(''), // ⬅ ONE assistant message, not N chunks
    status,
    finishReason,
    usage: turn.usage,
    startedAt: turn.startedAt,
    firstTokenAt: turn.firstTokenAt,
  });

  recordStream(toMetrics(turn, transport, finishReason, result));
  return persisted;
};

/**
 * Chapter 09 §09.4 — the failure hook. A provider error mid-answer must not throw
 * away the text the user already saw.
 */
export const interruptTurn = (
  turn: LiveTurn,
  transport: StreamMetrics['transport'],
  result: { frames: number; chars: number },
): PersistedTurn => finaliseTurn(turn, transport, 'error', result);

/**
 * Chapter 07 §07.6 — pump the stream into a transport-specific writer.
 * The pump owns coalescing and backpressure; the writer owns the framing.
 */
export const streamTurn = async (
  turn: LiveTurn,
  transport: 'raw' | 'sse',
  write: (text: string) => Promise<void>,
  signal?: AbortSignal,
): Promise<{ result: PumpResult; finishReason: FinishReason }> => {
  const result = await pump(write, runStream(turn, signal), PUMP_POLICY, signal);
  const finishReason: FinishReason = signal?.aborted ? 'aborted' : 'stop';

  finaliseTurn(turn, transport, finishReason, result);
  return { result, finishReason };
};

/**
 * Chapter 02 §02.2 / §07.1 — the BUFFERED path.
 *
 * Note how little code this is: it is the same loop, and the accumulator is
 * already there. That is the notes' whole point — the buffered endpoint is not
 * "no chunks exist", it is "someone chose to accumulate them".
 *
 * It is kept here deliberately so the difference between the two endpoints is
 * visible in one file, and so `/api/metrics` shows its `charsPerFrame` — a single
 * enormous frame, which is exactly the buffering smoke alarm from chapter 04 §04.6.
 */
export const chatBuffered = async (
  conversationId: string,
  message: string,
  signal?: AbortSignal,
): Promise<{ turn: LiveTurn; text: string }> => {
  const turn = prepareTurn(conversationId, message);

  for await (const _delta of runStream(turn, signal)) {
    // Intentionally empty: accumulating is what `runStream` already did, and
    // NOTHING is delivered until the loop finishes.
  }

  const text = turn.buffer.join('');
  finaliseTurn(turn, 'buffered', 'stop', { frames: 1, chars: text.length });

  return { turn, text };
};
