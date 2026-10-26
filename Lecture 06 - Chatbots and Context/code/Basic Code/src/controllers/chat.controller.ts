import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { config, CONTEXT_POLICY } from '../config/config.js';
import { openSseStream, sendDone, sendError, sendEvent } from '../lib/sse.js';
import { isOffline, streamModel } from '../lib/llm.js';
import {
  compactIfNeeded,
  finaliseTurn,
  prepareTurn,
  previewTurn,
  runTurn,
} from '../services/chat.service.js';
import { deleteUserMemory, exportUserMemory, saveFact } from '../services/memory.service.js';
import {
  assertOwnedBy,
  createSession,
  deleteSession,
  listSessions,
  loadSession,
  summariseSession,
} from '../services/session.service.js';
import { estimateTokens, projectAccumulation } from '../services/token.service.js';
import { requireUserId } from '../middleware/validate.js';

/**
 * Chapter 01 §01.7 — controllers stay thin.
 * No prompt text, no token maths, no provider details: those live in `services/`.
 */

/** Chapter 08 §08.5 — what the process is wired to, and which policy is live. */
export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'UP',
    mode: isOffline() ? 'OFFLINE (no provider key — deterministic stub)' : 'LIVE',
    provider: config.AI_PROVIDER,
    model: config.AI_MODEL,
    endpoint: config.AI_ENDPOINT,
    temperature: config.AI_TEMPERATURE,
    contextWindow: config.CONTEXT_WINDOW_TOKENS,
    outputReserve: config.AI_MAX_TOKENS,
    inputBudget: config.INPUT_BUDGET,
    contextPolicy: CONTEXT_POLICY,
    guardrails: {
      maxInputChars: config.MAX_INPUT_CHARS,
      citationMatchThreshold: config.CITATION_MATCH_THRESHOLD,
      strictVerification: config.STRICT_VERIFICATION,
    },
    sessions: listSessions().length,
    uptimeSeconds: Math.floor(process.uptime()),
  });
};

/** Chapter 01 §01.2 — the model has no memory, so the application must open one. */
export const postSession = (req: Request, res: Response): void => {
  const userId = requireUserId(req);
  const session = createSession(userId);
  res.status(201).json({ success: true, data: { sessionId: session.sessionId, userId } });
};

/**
 * Chapter 01 §01.11 — never read a session without proving ownership.
 * Chapter 02 §02.6 — the same history, in three currencies: turns, tokens, money-shape.
 * Chapter 06 §06.9 — refusal rate is tracked like an error rate.
 */
export const getSession = (req: Request, res: Response): void => {
  const userId = requireUserId(req);
  const session = loadSession(String(req.params.sessionId ?? ''));

  if (!session) {
    res.status(404).json({ error: 'Not Found', message: 'No such session.' });
    return;
  }
  assertOwnedBy(session, userId);

  const ledger = session.ledger;
  const rate = (count: number): number => (ledger.length ? Number((count / ledger.length).toFixed(2)) : 0);
  const last = ledger[ledger.length - 1];

  res.status(200).json({
    success: true,
    data: {
      ...summariseSession(session),
      memory: exportUserMemory(userId),
      cost: {
        cumulativeInputTokens: ledger.reduce((total, row) => total + row.inputTokens, 0),
        cumulativeOutputTokens: ledger.reduce((total, row) => total + row.outputTokens, 0),
        peakInputTokens: ledger.reduce((peak, row) => Math.max(peak, row.inputTokens), 0),
      },
      quality: {
        refusalRate: rate(ledger.filter((row) => row.refused).length),
        turnsWithTrimming: rate(ledger.filter((row) => row.historyTrimmed > 0).length),
        lastTtftMs: last?.ttftMs,
        lastItlMs: last?.itlMs,
      },
      note: 'Older turns are compacted into runningSummary once the policy threshold is passed (chapter 03 §03.4).',
    },
  });
};

/** Chapter 04 §04.8 — the right to be forgotten is an API, not a migration. */
export const removeSession = (req: Request, res: Response): void => {
  const userId = requireUserId(req);
  const session = loadSession(String(req.params.sessionId ?? ''));

  if (!session) {
    res.status(404).json({ error: 'Not Found', message: 'No such session.' });
    return;
  }
  assertOwnedBy(session, userId);

  deleteSession(session.sessionId);
  const deletedFacts = deleteUserMemory(userId);
  res.status(200).json({ success: true, data: { sessionDeleted: true, factsDeleted: deletedFacts } });
};

/** Chapter 04 §04.9 — durable facts are written by the application, never by the model. */
export const postMemory = (req: Request, res: Response): void => {
  const userId = requireUserId(req);
  const session = loadSession(String(req.params.sessionId ?? ''));

  if (!session) {
    res.status(404).json({ error: 'Not Found', message: 'No such session.' });
    return;
  }
  assertOwnedBy(session, userId);

  const { category, content, source, expiresInDays } = req.body as {
    category: 'preference' | 'constraint' | 'identity';
    content: string;
    source: 'explicit-user' | 'inferred';
    expiresInDays?: number;
  };

  const fact = saveFact(userId, {
    category,
    content,
    source,
    expiresAt: expiresInDays ? Date.now() + expiresInDays * 86_400_000 : undefined,
  });

  res.status(201).json({ success: true, data: fact });
};

/**
 * Chapters 02 + 03 + 04 + 07 — inspect the assembled payload and its budget.
 * No model call, no writes: this is how you study the context window for free.
 */
export const postPreview = (req: Request, res: Response): void => {
  const userId = requireUserId(req);
  const { sessionId, message } = req.body as { sessionId: string; message: string };
  const session = loadSession(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Not Found', message: 'No such session.' });
    return;
  }
  assertOwnedBy(session, userId);

  const preview = previewTurn(session, message);
  res.status(200).json({
    success: true,
    data: {
      input: preview.input,
      retrievedChunks: preview.chunks,
      factsInjected: preview.facts,
      budget: {
        ...preview.report,
        // Tier 2 — the exact encoder, run once on the final payload (§02.4).
        exactInputTokens: preview.report.messages.reduce((total, turn) => total + estimateTokens(turn.content), 0),
      },
    },
  });
};

/** Chapter 02 §02.5 — see the O(N^2) growth of naive history appending for yourself. */
export const postProjection = (req: Request, res: Response): void => {
  const { turns, systemTokens, expansionPerTurn, windowTurns } = req.body as {
    turns: number;
    systemTokens: number;
    expansionPerTurn: number;
    windowTurns: number;
  };

  const rows = projectAccumulation({ turns, systemTokens, expansionPerTurn, windowTurns, inputBudget: config.INPUT_BUDGET });
  const last = rows[rows.length - 1]!;

  res.status(200).json({
    success: true,
    data: {
      rows,
      summary: {
        naiveCumulativeTokens: last.naiveCumulativeTokens,
        managedCumulativeTokens: last.managedCumulativeTokens,
        // The multiplier is the whole point of chapter 02 §02.5.
        naiveOverManaged: Number((last.naiveCumulativeTokens / Math.max(1, last.managedCumulativeTokens)).toFixed(2)),
      },
    },
  });
};

/** Chapter 08 §08.6 — the buffered path. Everything is verified before it is returned. */
export const postChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const { sessionId, message } = req.body as { sessionId: string; message: string };
    const session = loadSession(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Not Found', message: 'No such session.' });
      return;
    }
    assertOwnedBy(session, userId);

    res.status(200).json({ success: true, data: await runTurn(session, message) });
  } catch (error) {
    next(error);
  }
};

/**
 * Chapter 05 §05.7 — the streamed path. Six responsibilities, in order:
 * validate → set headers → wire cancellation → stream → terminate → persist.
 */
export const postChatStream = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const { sessionId, message } = req.body as { sessionId: string; message: string };

    // Everything that can fail with a status code must fail BEFORE the stream
    // opens: once writeHead(200) has run, a 4xx is no longer possible.
    const session = loadSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Not Found', message: 'No such session.' });
      return;
    }
    assertOwnedBy(session, userId);

    const prepared = prepareTurn(session, message);
    const startedAt = Date.now();

    // §05.5 — headers before the first write.
    openSseStream(res);

    if (!prepared.ok) {
      // A blocked input is still a valid stream: the client should render the refusal.
      sendEvent(res, 'guardrail', { findings: prepared.refusal!.findings });
      sendEvent(res, 'refusal', { answer: prepared.refusal!.answer });
      sendDone(res);
      return;
    }

    sendEvent(res, 'start', { messageId: randomUUID(), model: config.AI_MODEL, tokensByTier: prepared.report.tokensByTier });

    // §05.9 — no orphaned generation: when the client leaves, stop paying for tokens.
    // We listen on the *response*, because on a POST the request stream has already
    // finished by the time this handler runs, so `req.on('close')` fires immediately.
    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) abort.abort();
    });

    let full = '';
    let deltas = 0;
    let firstAt = 0;
    let previousAt = 0;
    let gapTotal = 0;

    try {
      for await (const delta of streamModel(prepared.messages, abort.signal)) {
        const now = Date.now();
        if (firstAt === 0) firstAt = now;
        else gapTotal += now - previousAt;
        previousAt = now;

        full += delta;
        deltas += 1;
        sendEvent(res, 'token', { delta });
      }
    } catch (error) {
      if (abort.signal.aborted) return; // the client left; nothing to report
      sendError(res, 'generation_failed', (error as Error).message);
      return;
    }

    // Chapter 05 §05.3 — TTFT is what the user perceives; ITL is the typing speed.
    const ttftMs = firstAt === 0 ? undefined : firstAt - startedAt;
    const itlMs = deltas > 1 ? Math.round(gapTotal / (deltas - 1)) : undefined;

    const grounded = finaliseTurn(prepared, full, {
      inputTokens: prepared.report.inputTokens,
      outputTokens: estimateTokens(full),
      ttftMs,
      itlMs,
    });

    if (grounded.citations.length > 0) sendEvent(res, 'citation', { ids: grounded.citations });

    // Streaming variant of the §07.8 fail-closed policy: the tokens are already on
    // the wire, so the client is told to *replace* what it rendered.
    //
    // §05.9 hazard, deliberately left visible here: the machine-readable `CITATIONS:`
    // line is streamed like any other token, then stripped before persistence. A
    // production system suppresses it (buffer a small tail, or return citations as
    // structured output — Lecture 10). The `citation` event above is the authoritative signal.
    const streamedAnswer = full.replace(/^[ \t]*CITATIONS?[ \t]*:.*$/im, '').trim();
    if (streamedAnswer !== grounded.answer) {
      sendEvent(res, 'guardrail', { action: 'replace', findings: grounded.findings, answer: grounded.answer });
    }

    sendEvent(res, 'done', { finishReason: 'stop', totalTokens: estimateTokens(full), ttftMs, itlMs, isRefusal: grounded.isRefusal });
    sendDone(res);

    // §05.7 step 7 — the assistant turn only exists now, so compaction is after the stream.
    await compactIfNeeded(session);
  } catch (error) {
    next(error);
  }
};


