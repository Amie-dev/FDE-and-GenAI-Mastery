import type { Message, Session } from "../types";
import { config } from "../config/config";

function uid(): string {
  return crypto.randomUUID();
}

/** Short-Term Memory (Chapter 2).
 *
 * One Map holds every session. A session keeps its full message history, but
 * the LLM only ever sees the last `stmWindowSize` messages — a sliding window
 * that stops context from growing quadratically as the conversation gets long.
 *
 * (Swap this Map for a database table `chat_messages(session_id, ...)` in
 * production, exactly as Chapter 2 describes.)
 */

const sessions = new Map<string, Session>();

export function loadSession(userId: string, sessionId: string): Session {
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const session: Session = {
    id: sessionId,
    userId,
    messages: [],
    updatedAt: new Date().toISOString(),
  };
  sessions.set(sessionId, session);
  return session;
}

export function appendMessage(session: Session, message: Message): void {
  session.messages.push(message);
  session.updatedAt = new Date().toISOString();
  sessions.set(session.id, session);
}

/** Returns only the last `windowSize` messages — the sliding window (Chapter 2). */
export function getRecentMessages(session: Session, windowSize: number): Message[] {
  return session.messages.slice(-windowSize);
}

export function listSessions(): Session[] {
  return Array.from(sessions.values());
}

export { config as stmConfig };
