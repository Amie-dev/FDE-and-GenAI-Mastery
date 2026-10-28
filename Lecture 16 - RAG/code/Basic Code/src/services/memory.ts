import type { Message, Session } from "../types";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Memory service — Chapter 07 (conversation state).
 *
 * In-memory session store keyed by sessionId. Each session holds its message
 * history so a follow-up question can be answered with earlier turns. The
 * tenantId lives on the session so a session never crosses tenant boundaries.
 *
 * (Swap the Map for Redis in production; add TTL as Chapter 07 describes.)
 */

const sessions = new Map<string, Session>();

export function loadSession(sessionId: string, tenantId: string): Session {
  const existing = sessions.get(sessionId);
  if (existing) return existing;
  const session: Session = { id: sessionId, tenantId, messages: [], updatedAt: new Date().toISOString() };
  sessions.set(sessionId, session);
  return session;
}

export function saveSession(session: Session): void {
  session.updatedAt = new Date().toISOString();
  sessions.set(session.id, session);
}

export function appendMessage(session: Session, message: Message): void {
  session.messages.push(message);
  // Cap history length so the prompt never overflows (Chapter 07 priority tiers).
  const MAX = 20;
  if (session.messages.length > MAX) {
    session.messages = session.messages.slice(-MAX);
  }
}

export function listSessions(): Session[] {
  return Array.from(sessions.values());
}