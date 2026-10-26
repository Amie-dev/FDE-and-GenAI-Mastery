import { randomUUID } from 'node:crypto';
import type { ChatTurn, SessionState, TurnLedger } from '../types/chat.types.js';

/**
 * Chapter 01 — the session store.
 *
 * The model is stateless (chapter 01 §01.2): no memory survives a request.
 * *This* module is the memory. In production it is Redis for the hot turns plus
 * Postgres for the cold transcript; here it is a Map, and nothing else changes.
 */

const sessions = new Map<string, SessionState>();

export const createSession = (userId: string): SessionState => {
  const session: SessionState = {
    sessionId: randomUUID(),
    userId,
    createdAt: Date.now(),
    turns: [],
    compacted: [],
    runningSummary: '',
    ledger: [],
  };

  sessions.set(session.sessionId, session);
  return session;
};

export const loadSession = (sessionId: string): SessionState | undefined => sessions.get(sessionId);

export const listSessions = (): SessionState[] => [...sessions.values()];

/**
 * Chapter 01 §01.11 — a session id is a *capability*, so treat it like a bearer
 * token: never read a session without proving the caller owns it.
 */
export const assertOwnedBy = (session: SessionState, userId: string): void => {
  if (session.userId !== userId) {
    throw Object.assign(new Error('This session belongs to another user.'), { status: 403 });
  }
};

/**
 * Chapter 01 §01.11 — persist the user turn BEFORE the model call.
 * A crash mid-generation must not lose the message the user already saw.
 */
export const appendUser = (sessionId: string, text: string): SessionState => {
  const session = requireSession(sessionId);
  session.turns.push({ role: 'user', content: text });
  return session;
};

/** Chapter 01 §01.6 — echo the assistant turn back, or the next request has amnesia. */
export const appendAssistant = (sessionId: string, text: string): SessionState => {
  const session = requireSession(sessionId);
  session.turns.push({ role: 'assistant', content: text });
  return session;
};

/** Chapter 03 §03.4 — the running summary is written by the off-hot-path compactor. */
export const setRunningSummary = (sessionId: string, summary: string): void => {
  requireSession(sessionId).runningSummary = summary;
};

/**
 * Chapter 03 §03.4 — compaction removes turns from the HOT path, never from the
 * record. The durable transcript stays queryable for audit and semantic recall.
 */
export const appendCompacted = (sessionId: string, turns: ChatTurn[]): void => {
  requireSession(sessionId).compacted.push(...turns);
};

/** Chapter 02 §02.9 step 4 — instrument the budget, don't guess it. */
export const recordLedger = (sessionId: string, row: TurnLedger): void => {
  requireSession(sessionId).ledger.push(row);
};

/** Chapter 04 §04.8 — the right to be forgotten is an API, not a migration. */
export const deleteSession = (sessionId: string): boolean => sessions.delete(sessionId);

/** Chapter 02 §02.6 — the same history, counted in three currencies. */
export const summariseSession = (session: SessionState) => ({
  sessionId: session.sessionId,
  userId: session.userId,
  createdAt: session.createdAt,
  turnCount: session.turns.length,
  compactedTurnCount: session.compacted.length,
  transcript: session.turns as ChatTurn[],
  runningSummary: session.runningSummary,
  ledger: session.ledger,
});

const requireSession = (sessionId: string): SessionState => {
  const session = sessions.get(sessionId);
  if (!session) {
    throw Object.assign(new Error(`No session "${sessionId}". Create one with POST /api/session.`), { status: 404 });
  }
  return session;
};
