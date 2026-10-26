# Chapter 03: Session Store & Role Architecture

> **Chapter goal:** give the stateless model the memory it does not have, and make the role boundary
> something the code enforces rather than something the prompt hopes for.
> **Notes chapters covered:** 01 §01.2 (statelessness), §01.6 (echo the assistant turn), §01.11 (the
> reference architecture: persist first, check ownership), 04 §04.8 (the right to be forgotten),
> 03 §03.4 (compaction moves turns to the cold path).

---

## 3.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/session.service.ts` | the session store: create, load, append, compact, delete, summarise |

There is **no model call anywhere in this file.** That is the point of chapter 01: the model is stateless,
so the conversation lives in a store *you* control.

---

## 3.2 Commands

```bash
npm run typecheck
```

---

## 3.3 `src/services/session.service.ts` (full file)

```ts
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
```

### Block by block

**`const sessions = new Map<string, SessionState>()`** — the whole store. Chapter 01 §01.2 says the model
"has no memory"; the corollary is that *someone else must*. In production that someone is Redis (hot turns)
plus Postgres (cold transcript). Here it is a `Map`, and the comment says so, because the *interface* is what
you are learning — not the storage engine.

**`createSession`** — allocates a `randomUUID` and an empty record. Note what is initialised:

```ts
turns: [],          // hot path
compacted: [],      // cold path (the durable transcript)
runningSummary: '', // chapter 03 §03.4
ledger: [],         // chapter 02 §02.9 step 4
```

Those four fields are the four chapters that follow.

**`assertOwnedBy` — the capability check (ch 01 §01.11).** This is the security idea most tutorials skip:

```ts
export const assertOwnedBy = (session: SessionState, userId: string): void => {
  if (session.userId !== userId) {
    throw Object.assign(new Error('This session belongs to another user.'), { status: 403 });
  }
};
```

The notes are blunt about why: *"A session id is a capability; treat it like a bearer token."* If you can
read any session by guessing its id, then `sessionId` is not an identifier — it is a password. The `status`
property on the error is what `app.ts` later maps to HTTP 403.

**`appendUser` — durability first.** The function itself is three lines; its *call site* is the interesting
part. `chat.service.ts` calls it **before** the model call, for the reason the notes give: *"otherwise a
crash mid-generation loses the user's message and the transcript stops matching what the user saw."*
The store cannot enforce that ordering — only the orchestrator can — so this file documents it and chapter 10
honours it.

**`appendAssistant` — closing the loop (ch 01 §01.6).** This is the line that makes a stateless model *look*
like it remembers. The model's previous answer is stored and later re-sent as an `assistant` turn. Skip it
and the next request is amnesiac — the model will contradict itself because it genuinely never saw its own
prior commitment.

**`setRunningSummary` + `appendCompacted` — the hot/cold split (ch 03 §03.4).**

```ts
export const appendCompacted = (sessionId: string, turns: ChatTurn[]): void => {
  requireSession(sessionId).compacted.push(...turns);
};
```

Compaction removes turns from `turns` and appends them to `compacted`. Nothing is destroyed. Two chapters
depend on that: chapter 03 §03.5 (semantic recall searches the cold store) and chapter 03 §03.7
(a compliance assistant needs "the raw record").

**`recordLedger`** — appends one telemetry row per turn. Chapter 02 §02.9 step 4: *"without that data, every
budget conversation is an argument; with it, it is arithmetic."*

**`deleteSession` — compliance as a feature (ch 04 §04.8).** One `Map.delete`, but the *existence* of the
method is the architectural point: the right to be forgotten is an API you can call, not a migration you
have to plan. `chat.controller.ts` exposes it as `DELETE /api/session/:sessionId`.

**`summariseSession`** — a read-only projection for the API: hot turn count, cold turn count, the transcript,
the summary and the ledger. It reports both counts deliberately, so you can watch a conversation move from
hot to cold as it grows.

**`requireSession`** — the not-found path. It throws with `status: 404` rather than returning `undefined`,
so every caller gets one consistent error shape and the controller needs no null check at each step.
One subtlety worth noticing: `requireSession` is declared at the *bottom* of the file. Function declarations
are hoisted, so this is legal and keeps the public API at the top of the file, which is where a reader looks.

---

## 3.4 The two design rules this file encodes

| Rule | Where it lives | What breaks without it |
| :--- | :--- | :--- |
| **Persist the user turn before the model call** | `appendUser` + its call site in `chat.service.ts` | A crash mid-generation loses a message the user already saw |
| **Never trust a `sessionId` without an ownership check** | `assertOwnedBy`, called by every route handler | Any user can read any transcript by guessing an id |

Both are chapter 01 §01.11's rules. Neither is enforceable by a type; both are enforceable by a reviewer who
knows to look for them.

---

## 3.5 Verify

```bash
# from: code/Basic Code/  (server running: npm run dev)
curl -s -X POST http://localhost:8090/api/session -H 'x-user-id: u_101'
# {"success":true,"data":{"sessionId":"…","userId":"u_101"}}

curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8090/api/session/<id>
# 401  — no x-user-id header

curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8090/api/session/<id> -H 'x-user-id: u_999'
# 403  — the session belongs to another user
```

If you see `201`, `401` and `403` in that order, the role/capability boundary is working.

---

### Navigation

- **Previous:** [Chapter 02 — Config, Prompts & Types](./02_Config_Prompts_and_Types.md)
- **Next:** [Chapter 04 — Token Accounting & the Budget](./04_Token_Accounting_and_the_Budget.md)
- **Notes:** [../../notes/01_Stateless_LLMs_Conversation_History_and_Role_Architecture.md](../../../notes/01_Stateless_LLMs_Conversation_History_and_Role_Architecture.md)
