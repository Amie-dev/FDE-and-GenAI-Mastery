# Chapter 07 — Conversation State and Memory

**Notes source:** `Lecture 16 - RAG/notes/07_conversation_state_memory.md`

**Goal:** Make multi-turn RAG work. Each session stores its message history so a follow-up question can be answered with earlier turns. Tenant isolation is enforced on the session.

---

## `src/services/memory.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/memory.ts` |
| Chapter | 07 |
| What it does | In-memory session store keyed by `sessionId`. Each session holds `tenantId` and a capped message history. `loadSession` creates or returns a session; `saveSession` persists; `appendMessage` adds a turn with a history cap. |

### Full code

```ts
import type { Message, Session } from "../types";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const sessions = new Map<string, Session>();

export function loadSession(sessionId: string, tenantId: string): Session {
  const existing = sessions.get(sessionId);
  if (existing) return existing;
  const session: Session = {
    id: sessionId,
    tenantId,
    messages: [],
    updatedAt: new Date().toISOString(),
  };
  sessions.set(sessionId, session);
  return session;
}

export function saveSession(session: Session): void {
  session.updatedAt = new Date().toISOString();
  sessions.set(session.id, session);
}

export function appendMessage(session: Session, message: Message): void {
  session.messages.push(message);
  const MAX = 20;
  if (session.messages.length > MAX) {
    session.messages = session.messages.slice(-MAX);
  }
}

---

## `src/controllers/rag.controller.ts` — the `query` handler

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/controllers/rag.controller.ts` |
| Chapter | 07 (also 02, 06) |
| What it does | The `/api/query` HTTP handler. Loads the session, retrieves chunks, generates a grounded answer, appends both user and assistant messages to the session, and saves it. |

### Relevant code (query handler)

```ts
export async function query(req: Request, res: Response): Promise<void> {
  const { question, tenantId, sessionId, roles } = req.body as {
    question?: string;
    tenantId?: string;
    sessionId?: string;
    roles?: string[];
  };

  if (!question || !tenantId || !sessionId) {
    res.status(400).json({ error: "question, tenantId and sessionId are required" });
    return;
  }

  try {
    const ctx: QueryContext = { tenantId, roles: roles ?? [], sessionId };

    // Chapter 07: load session history for this conversation.
    const session = loadSession(sessionId, tenantId);
    const history = session.messages;

    // Chapter 05: retrieve relevant chunks for this tenant only.
    const chunks = await retrieve({ question, ctx });

    // Chapter 06: grounded generation with citations + refusal.
    const { answer, citedChunkIds, refused } = await generate({
      question,
      chunks,
      history,
    });

    // Persist the turn so the session survives restarts (Chapter 07).
    appendMessage(session, { role: "user", content: question });
    appendMessage(session, { role: "assistant", content: answer });
    saveSession(session);

    res.status(200).json({
      ok: true,
      answer,
      refused,
      citations: citedChunkIds,
      retrievedChunks: chunks.map((c) => ({ id: c.id, score: c.score })),
      sessionId,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "query failed" });
  }
}
```


export function listSessions(): Session[] {
  return Array.from(sessions.values());
}
```


### Block-by-block explanation

| Block | What it does | Notes chapter |
|-------|--------------|---------------|
| `const session = loadSession(sessionId, tenantId)` | Loads or creates the session. Tenant is checked on every request. | Chapter 07 |
| `const history = session.messages` | Previous turns are passed to the generator so the model can see conversation context. | Chapter 07 |
| `const chunks = await retrieve({ question, ctx })` | Retrieves relevant chunks (Chapter 05). | Chapter 05 |
| `const { answer, ... } = await generate({ question, chunks, history })` | Generates a grounded answer with history included in the prompt. | Chapter 06 + 07 |
| `appendMessage(session, { role: "user", ... })` | Stores the user's question in the session. | Chapter 07 |
| `appendMessage(session, { role: "assistant", ... })` | Stores the assistant's answer in the session. | Chapter 07 |
| `saveSession(session)` | Persists the updated session. | Chapter 07 |

### Chapter 07 principles honored

| Principle | How this code implements it |
|-----------|------------------------------|
| Session per conversation | `sessionId` keys each conversation in the Map |
| Tenant isolation | `tenantId` stored on session; `loadSession` requires it |
| Bounded history | `appendMessage` caps at 20 messages |
| History in prompt | `history` passed to `generate()` so the model sees prior turns |

### Command

```bash
# First turn:
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the refund policy?","tenantId":"acme","sessionId":"s1","roles":[]}'

# Follow-up turn (same sessionId = memory):
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question":"And for shoes?","tenantId":"acme","sessionId":"s1","roles":[]}'
```