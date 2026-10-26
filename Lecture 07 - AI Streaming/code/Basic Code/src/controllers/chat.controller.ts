import { NextFunction, Request, Response } from 'express';
import { config, PUMP_POLICY } from '../config/config.js';
import { isOffline } from '../lib/llm.js';
import {
  frameEvent,
  openRawTextStream,
  openSseStream,
  sendDone,
  sendError,
  sendEvent,
  sendHeartbeat,
} from '../lib/sse.js';
import { chatBuffered, interruptTurn, prepareTurn, streamTurn } from '../services/chat.service.js';
import { getConversation as loadConversation, listConversations } from '../services/conversation.service.js';
import { activeStreams, beginStream, endStream, metricsSummary } from '../services/metrics.service.js';
import { writeWithBackpressure } from '../services/pump.service.js';

/**
 * Chapter 06 §06.2 — controllers stay thin.
 *
 * No prompt text, no token maths, no provider details. What lives here is the
 * HTTP lifecycle, which is exactly what the notes assign to this layer: headers
 * before the first byte, flush, cancellation, close, cleanup.
 */

/** Chapter 06 §06.3 — the seven invariants, as data, so /api/health can state them. */
const INVARIANTS = [
  'forward, do not accumulate',
  'flush per chunk',
  'intermediaries must not buffer',
  'the connection must not idle out',
  'the client must read incrementally',
  'the UI must append, not replace',
  'cancellation must propagate upstream',
];

/** Chapter 06 §06.2 — what this process is wired to, and which policy is live. */
export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'UP',
    mode: isOffline() ? 'OFFLINE (no provider key — deterministic stub)' : 'LIVE',
    provider: config.AI_PROVIDER,
    model: config.AI_MODEL,
    endpoint: config.AI_ENDPOINT,
    transports: ['buffered', 'raw text (text/plain)', 'sse (text/event-stream)'],
    pumpPolicy: PUMP_POLICY,
    heartbeatMs: config.HEARTBEAT_MS,
    readingSpeedTps: config.READING_TPS,
    pipelineInvariants: INVARIANTS,
    activeStreams: activeStreams(),
    conversations: listConversations().length,
    uptimeSeconds: Math.floor(process.uptime()),
  });
};

/**
 * Chapter 02 §02.2 / chapter 07 §07.1 — the BUFFERED endpoint.
 *
 * Chapter 07 §07.1 is explicit that this is the `String` return type: there is
 * exactly one value and it exists only after completion. The note in the response
 * is the whole point of the chapter — the deltas were always there.
 */
export const postChatBuffered = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { conversationId, message } = req.body as { conversationId: string; message: string };
    const { turn, text } = await chatBuffered(conversationId, message);

    res.status(200).json({
      success: true,
      data: {
        transport: 'buffered',
        conversationId,
        messageId: turn.messageId,
        answer: text,
        /** The server saw a first delta here — but delivered nothing (chapter 03 §03.2). */
        serverFirstDeltaMs: turn.firstTokenAt === null ? null : turn.firstTokenAt - turn.startedAt,
        /** What the user actually waited, because delivery was withheld. */
        clientSeesTextAtMs: Date.now() - turn.startedAt,
        deltasConsumed: turn.deltas,
        note: 'Chapter 02 §02.2 — the chunks existed; this endpoint chose to accumulate them.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Chapter 06 §06.2 — the shared stream lifecycle.
 *
 * Both streaming transports use the SAME driver; only the sink differs. That is
 * the "two streams, one bridge" shape from chapter 06 §06.1.
 */
const driveStream = async (req: Request, res: Response, transport: 'raw' | 'sse'): Promise<void> => {
  const { conversationId, message } = req.body as { conversationId: string; message: string };
  const turn = prepareTurn(conversationId, message);

  /**
   * Chapter 06 §06.6 — cancellation must propagate upstream.
   * We listen on the RESPONSE, not the request: on a POST the request stream has
   * already finished by the time this handler runs, so `req.on('close')` would
   * fire immediately.
   */
  const abort = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abort.abort();
  });

  beginStream();

  // Chapter 05 §05.1/§05.3.2 — headers BEFORE the first body byte: the status commits on first write.
  if (transport === 'sse') openSseStream(res);
  else openRawTextStream(res);

  /**
   * Chapter 05 §05.3.3 — only SSE can carry a no-op frame. In raw text every byte
   * is payload, so a whitespace heartbeat would corrupt the answer.
   */
  const heartbeat = transport === 'sse' ? setInterval(() => sendHeartbeat(res), config.HEARTBEAT_MS) : null;

  /** The sink: the pump owns the policy, this owns the framing (chapter 07 §07.6). */
  const write =
    transport === 'sse'
      ? (text: string): Promise<void> => writeWithBackpressure(res, frameEvent('token', { text }))
      : (text: string): Promise<void> => writeWithBackpressure(res, text);

  try {
    if (transport === 'sse') {
      sendEvent(res, 'status', { phase: 'generating', model: config.AI_MODEL, conversationId });
    }

    const { result, finishReason } = await streamTurn(turn, transport, write, abort.signal);

    if (transport === 'sse') {
      // Chapter 09 §09.5 — usage only exists now, so it is the last data event.
      sendEvent(res, 'usage', turn.usage);
      sendEvent(res, 'done', {
        finishReason,
        ttftMs: turn.firstTokenAt === null ? null : turn.firstTokenAt - turn.startedAt,
        itlMs: turn.deltas > 1 ? Math.round(turn.gapTotalMs / (turn.deltas - 1)) : null,
      });
      sendDone(res);
    } else if (!res.writableEnded) {
      res.end();
    }

    void result;
  } catch (error) {
    /**
     * Chapter 09 §09.4 — the failure hook. The text the user already read is
     * persisted with status `interrupted`, never thrown away.
     */
    interruptTurn(turn, transport, { frames: 0, chars: turn.buffer.join('').length });

    if (!res.writableEnded) {
      // Chapter 07 §07.7 — the status is already 200, so the error goes in-band.
      if (transport === 'sse') sendError(res, 'generation_failed', (error as Error).message);
      else res.end();
    }
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    endStream();
  }
};

/** Chapter 05 §05.5 — raw text streaming: the simplest correct transport. */
export const postChatStreamRaw = (req: Request, res: Response, next: NextFunction): void => {
  driveStream(req, res, 'raw').catch(next);
};

/** Chapter 05 §05.3 — SSE: the same stream with typed events. */
export const postChatStreamEvents = (req: Request, res: Response, next: NextFunction): void => {
  driveStream(req, res, 'sse').catch(next);
};

/**
 * Chapter 09 §09.2 — the proof of the dual-write pattern.
 * Whatever transport was used, one exchange produced exactly ONE assistant turn.
 */
export const getConversationHandler = (req: Request, res: Response): void => {
  const conversation = loadConversation(String(req.params.conversationId ?? ''));

  if (!conversation) {
    res.status(404).json({ error: 'Not Found', message: 'No such conversation.' });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      conversationId: conversation.conversationId,
      turns: conversation.turns,
      turnCount: conversation.turns.length,
      assistantTurns: conversation.turns.filter((turn) => turn.role === 'assistant').length,
      note: 'Chapter 09 §09.1 — one exchange is ONE assistant turn, whatever the transport.',
    },
  });
};

/** Chapter 03 §03.5 / chapter 09 §09.8 — the metrics that catch streaming regressions. */
export const getMetrics = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      ...metricsSummary(),
      pumpPolicy: PUMP_POLICY,
      heartbeatMs: config.HEARTBEAT_MS,
      note: 'Chapter 09 §09.8 — client TTFT is not here: only the browser knows it, which is why the TTFT gap is the alert.',
    },
  });
};
