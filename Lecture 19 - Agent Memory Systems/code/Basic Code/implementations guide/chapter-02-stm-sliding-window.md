# Chapter 02 — Short-Term Memory & Sliding Window

**Notes source:** `Lecture 19 - Agent Memory Systems/notes/02_Short_Term_Memory_and_Sliding_Windows.md`

**Goal:** Implement Short-Term Memory (STM) — keep everything in the store, but only load the last N turns for the LLM. This is Chapter 02 because STM is the first memory layer the chat flow touches.

---

## 1. `src/services/stm.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/stm.ts` |
| Chapter | 02 |
| What it does | In-memory session store keyed by `sessionId`. `loadSession` creates or returns a session, `appendMessage` stores a turn, and `getRecentMessages` returns only the last `windowSize` messages — the sliding window. |

### Full code

```ts
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
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `const sessions = new Map<string, Session>()` | The in-memory store. Keyed by session ID so many users/sessions are isolated. |
| `loadSession(...)` | Returns the existing session or creates a new empty one. This is how the app makes the stateless LLM API stateful (Chapter 1). |
| `appendMessage(...)` | Pushes a `{ role, content }` turn into the session and updates `updatedAt`. |
| `getRecentMessages(..., windowSize)` | `session.messages.slice(-windowSize)` keeps only the last N messages — exactly the sliding window technique from Chapter 2. Old turns stay in the store but are not sent to the LLM. |
| `as const` / config import | Reads `stmWindowSize` from `.env` through the single config seam (Chapter 01). |

### Why sliding window

Without it, every request re-sends the whole history: token use grows quadratically (Chapter 1: `30²/2 × 80 = 36,000` vs `30 × 80 = 2,400` tokens). With a window of 6, every request is bounded and predictable.

### Command

```bash
# Start the server and hit /api/chat a few times; watch stmMessages stay small
npm run dev
```
