# Chapter 06: Conversation Store & the Dual Write

> **Chapter goal:** solve the problem streaming *creates* — if the answer arrives as 34 fragments, what exactly
> do you store? Answer: one turn per exchange, written once, keyed by an id minted before generation started.
> **Notes chapters covered:** 07 §07.8 (multi-user isolation, per-conversation locking), 09 §09.1 (one
> assistant message, not N chunks), 09 §09.2 (the dual-write pattern), 09 §09.3 (per-request state),
> 09 §09.4 (interrupted turns), 09 §09.6 (idempotent, atomic persistence).

---

## 6.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/conversation.service.ts` | `withLock` · `loadOrCreate` · `getConversation` · `listConversations` · `toMessages` · `appendUserTurn` · `upsertAssistantTurn` |

---

## 6.2 Commands

```bash
npm run typecheck
curl -s http://localhost:8097/api/conversation/demo | python3 -m json.tool
```

---

## 6.3 `src/services/conversation.service.ts` (full file)

```ts
import { randomUUID } from 'node:crypto';
import type { ChatTurn, Conversation, FinishReason, PersistedTurn, Usage } from '../types/streaming.types.js';

/**
 * Chapter 09 §09.2 — the conversation store the model does not have.
 *
 * Two rules keep this multi-user safe (chapter 07 §07.8):
 *   1. state is scoped to a CONVERSATION, never to a shared service field;
 *   2. every write to one conversation is serialised by a per-conversation lock,
 *      so two parallel tabs cannot interleave and corrupt the transcript.
 *
 * In a real system this is a database; here it is a Map so the whole lecture is
 * observable from an endpoint.
 */

const store = new Map<string, Conversation>();
const locks = new Map<string, Promise<unknown>>();

/**
 * Chapter 07 §07.8 — the lock key is the conversationId, never the userId:
 * one user legitimately runs several conversations in parallel.
 */
export const withLock = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous.then(() => fn());
  // Never let a rejected turn poison the chain for the next one.
  locks.set(
    key,
    run.catch(() => undefined),
  );
  return run;
};

export const loadOrCreate = (conversationId: string): Conversation => {
  const existing = store.get(conversationId);
  if (existing) return existing;

  const conversation: Conversation = { conversationId, createdAt: Date.now(), turns: [] };
  store.set(conversationId, conversation);
  return conversation;
};

export const getConversation = (conversationId: string): Conversation | null =>
  store.get(conversationId) ?? null;

export const listConversations = (): Conversation[] => [...store.values()];

/**
 * Chapter 09 §09.1 — the history the next prompt is built from.
 *
 * Notice what is NOT here: transport chunks. One exchange produces exactly one
 * user turn and exactly one assistant turn, so the prompt never accumulates
 * hundreds of redundant `assistant:` role markers.
 */
export const toMessages = (conversation: Conversation): ChatTurn[] =>
  conversation.turns.map((turn) => ({ role: turn.role, content: turn.content }));

/** Chapter 09 §09.3 — the user turn is recorded BEFORE the model call. */
export const appendUserTurn = (conversation: Conversation, content: string): PersistedTurn => {
  const turn: PersistedTurn = {
    messageId: randomUUID(),
    role: 'user',
    content,
    status: 'complete',
    finishReason: null,
    usage: null,
    createdAt: Date.now(),
    firstTokenAt: null,
    completedAt: Date.now(),
  };
  conversation.turns.push(turn);
  return turn;
};

export interface AssistantTurnInput {
  messageId: string;
  content: string;
  status: 'complete' | 'length' | 'interrupted';
  finishReason: FinishReason;
  usage: Usage;
  startedAt: number;
  firstTokenAt: number | null;
}

/**
 * Chapter 09 §09.6 — ONE atomic, idempotent write per exchange.
 *
 * The `messageId` is generated BEFORE streaming and the write is an upsert, so a
 * retry after a network failure cannot duplicate the turn.
 *
 * Chapter 09 §09.4 — an interrupted answer is still persisted: the user already
 * read it, and the next prompt depends on that text being present.
 */
export const upsertAssistantTurn = (conversation: Conversation, input: AssistantTurnInput): PersistedTurn => {
  const turn: PersistedTurn = {
    messageId: input.messageId,
    role: 'assistant',
    content: input.content,
    status: input.status,
    finishReason: input.finishReason,
    usage: input.usage,
    createdAt: input.startedAt,
    firstTokenAt: input.firstTokenAt,
    completedAt: Date.now(),
  };

  const index = conversation.turns.findIndex((existing) => existing.messageId === input.messageId);
  if (index >= 0) conversation.turns[index] = turn;
  else conversation.turns.push(turn);

  return turn;
};
```

---

## 6.4 Block by block

**Two module-level maps, and the difference between them is the whole design.**

| Map | Holds | Lifetime | Chapter |
| :--- | :--- | :--- | :--- |
| `store` | `conversationId → Conversation` | the conversation | 09 §09.2 |
| `locks` | `conversationId → Promise` | one generation | 07 §07.8 |

There is deliberately **no** third map for "the current buffer". The buffer lives in `LiveTurn` (chapter 07),
created per request, because chapter 09 §09.3 is explicit: *state lives per-request / per-conversation — never
on a shared singleton.*

**`withLock` — six lines of per-conversation serialization.**

```ts
const previous = locks.get(key) ?? Promise.resolve();
const run = previous.then(() => fn());
locks.set(key, run.catch(() => undefined));
return run;
```

| Line | Why it matters |
| :--- | :--- |
| `previous ?? Promise.resolve()` | the first caller for a key starts immediately |
| `previous.then(() => fn())` | the next caller waits for the previous one to *settle*, then runs |
| `run.catch(() => undefined)` | the stored chain must never be a rejected promise, or every later turn for that conversation would inherit the rejection |
| `return run` | the caller still sees the real result — including a real error |

The lock key is the **conversationId**, not the userId. Chapter 07 §07.8 gives the reason: one user legitimately
runs several conversations in parallel, so locking per user would serialise work that has no reason to be
serialised.

**`loadOrCreate` returns the live object, not a copy.** That is a deliberate trade for a lab: it lets the
controller read `conversation.turns` and see the write that just happened, with no re-fetch. A real
implementation returns a row and persists through a repository — the *shape* of the API is what you should
carry over, not the aliasing.

**`toMessages` is the answer to chapter 09 §09.1.** This is the function that would produce the "broken
history" the notes warn about if you stored chunks as messages: a 200-chunk answer would become 200
`assistant` turns, each with a redundant role marker, every one of them re-billed on every subsequent turn.
Because `upsertAssistantTurn` writes once, `toMessages` returns two turns per exchange — and the prompt stays
bounded.

**`appendUserTurn` runs *before* the model call, and that ordering is intentional.** Chapter 09 §09.3 lists it
as a rule: durability first. If the process dies between the user's message and the first token, the user's
message still exists — and the user can see that the system received it.

**`upsertAssistantTurn` is an upsert, and `findIndex` is the reason it is safe.** Chapter 09 §09.6 requires a
stable `messageId` plus an upsert so that a retry after a network failure cannot duplicate the turn. The
`messageId` is minted in `prepareTurn` *before* streaming starts, so the id is known to both the request that
streams and the hook that persists.

**`status` has three values and they come from two different places.** `complete` and `length` come from the
provider's `finishReason`; `interrupted` comes from the *transport* — the client vanished, or the provider
dropped. The `interrupted` case is chapter 09 §09.4: the user already read the text, so discarding it would
mean the model's next prompt contradicts what the user saw.

**The timestamps are load-bearing.** `createdAt` is copied from the request's `startedAt` (not from "now"), so
`firstTokenAt − createdAt` reconstructs this turn's TTFT straight from storage — chapter 09 §09.6 lists
timestamps as a persistence requirement, and this is why.

---

## 6.5 Seeing the dual write work

Run three exchanges through three *different* transports, then look at one conversation:

```bash
curl -s -X POST http://localhost:8097/api/chat -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch06","message":"buffered"}' > /dev/null
curl -sN -X POST http://localhost:8097/api/chat/stream -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch06","message":"raw"}' > /dev/null
curl -sN -X POST http://localhost:8097/api/chat/events -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch06","message":"sse"}' > /dev/null

curl -s http://localhost:8097/api/conversation/ch06 \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]; print("turns:", d["turnCount"], "assistant:", d["assistantTurns"]); [print(" -", t["role"], t["status"], repr(t["content"][:40])) for t in d["turns"]]'
```

Expected: `turns: 6  assistant: 3` — six turns for three exchanges, **three** assistant turns, each one a
complete answer rather than 18 fragments. That is the dual write: the client saw 18 frames per answer, the
store saw one row per answer.

Then kill a stream mid-flight and look again — the partial answer is there, flagged:

```bash
timeout 0.7 curl -sN -X POST http://localhost:8097/api/chat/stream -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch06","message":"interrupt me"}' > /dev/null
curl -s http://localhost:8097/api/conversation/ch06 \
  | python3 -c 'import json,sys; t=json.load(sys.stdin)["data"]["turns"][-1]; print(t["role"], t["status"], t["finishReason"], repr(t["content"][-30:]))'
```

Expected: `assistant interrupted aborted '…the backend forwards'` — the text the user actually read, kept and
labelled.

---

**Previous:** [Chapter 05 — Transports](./05_Transports_Raw_Text_and_SSE.md) ·
**Next:** [Chapter 07 — Buffered vs Streamed Orchestration](./07_Buffered_vs_Streamed_Orchestration.md)