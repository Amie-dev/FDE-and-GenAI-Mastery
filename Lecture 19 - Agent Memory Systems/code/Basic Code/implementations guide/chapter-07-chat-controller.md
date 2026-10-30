# Chapter 07 — Chat Controller & Routes

**Notes source:** `Lecture 19 - Agent Memory Systems/notes/Lecture_19_Complete_Notes.md` (system summary), Chapters 1–4 (STM + LTM + context), Chapter 6 (dreaming endpoint)

**Goal:** Wire everything into HTTP routes. This is the last chapter because the controller needs every service to already exist.

---

## 1. `src/controllers/memory.controller.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/controllers/memory.controller.ts` |
| Chapter | 07 |
| What it does | Three handlers: `chat` (one conversational turn with STM + LTM), `dream` (background reflection), `health` (liveness). The LLM call is a mock so the code runs without an API key — replace it with a real provider call when one is available. |

### Full code

```ts
import { Request, Response } from "express";
import { config } from "../config/config";
import {
  loadSession,
  appendMessage,
  getRecentMessages,
} from "../services/stm";
import { searchMemories } from "../services/ltm";
import { extractAndStoreFacts } from "../services/extraction";
import { assembleContext } from "../services/context";
import { runDream } from "../services/dream";

/** Mock LLM (Chapter 1 concept: the model is stateless, the app holds state). */
function mockLLM(messages: { role: string; content: string }[]): string {
  const memories = messages
    .filter((m) => m.role === "system" && m.content.startsWith("Memory:"))
    .map((m) => m.content.replace("Memory: ", ""));
  const lastUser = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content ?? "";

  let reply = "";
  if (memories.length > 0) {
    reply += `Based on what I remember about you: ${memories.join("; ")}. `;
  }
  reply += `You said: "${lastUser}".`;
  return reply;
}

/** POST /api/chat — one conversational turn with STM + LTM memory. */
export async function chat(req: Request, res: Response): Promise<void> {
  const { userId, sessionId, message } = req.body as {
    userId?: string;
    sessionId?: string;
    message?: string;
  };

  if (!userId || !sessionId || !message) {
    res.status(400).json({ error: "userId, sessionId and message are required" });
    return;
  }

  try {
    // 1. Load / create the session and store the user turn.
    const session = loadSession(userId, sessionId);
    appendMessage(session, { role: "user", content: message });

    // 2. STM: only the last N turns go to the model (sliding window).
    const stmMessages = getRecentMessages(session, config.stmWindowSize);

    // 3. LTM: retrieve relevant facts for this user.
    const ltmResults = searchMemories(userId, message, config.ltmTopK);

    // 4. Assemble context inside the token budget:
    //    system → LTM memories → STM messages → current query.
    const { messages, tokenBudget } = assembleContext({
      systemPrompt: "You are a helpful assistant with memory of the user.",
      ltmMemories: ltmResults.map((r) => r.memory),
      stmMessages,
      currentQuery: message,
      maxTokens: config.maxContextTokens,
    });

    // 5. Ask the (mock) LLM.
    const reply = mockLLM(messages);

    // 6. Persist the assistant turn so it survives in STM.
    appendMessage(session, { role: "assistant", content: reply });

    // 7. Extract new facts from the user turn into long-term memory.
    const newFacts = extractAndStoreFacts({
      userId,
      message,
      source: `session_${sessionId}`,
    });

    res.status(200).json({
      ok: true,
      reply,
      sessionId,
      stmMessages: stmMessages.length,
      ltmMemories: ltmResults.length,
      newFacts: newFacts.length,
      tokenBudget,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "chat failed",
    });
  }
}

/** POST /api/dream — run background reflection for a user (Chapter 6). */
export function dream(req: Request, res: Response): void {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  const result = runDream(userId);
  res.status(200).json({ ok: true, ...result });
}

/** GET /api/health — liveness check. */
export function health(_req: Request, res: Response): void {
  res.json({ status: "ok" });
}
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `mockLLM(...)` | Stand-in for a real LLM. Reads `Memory:` lines from the assembled context and the last user message, then builds a reply. Swap for OpenAI/Anthropic/etc. when a key is available (Chapter 1: the model never remembers; the app sends memory every turn). |
| `chat` handler, step 1–2 | `loadSession` + `appendMessage` store the user turn; `getRecentMessages` applies the STM sliding window (Chapter 2). |
| `chat` handler, step 3 | `searchMemories` fetches the top-K relevant facts for this user (Chapters 3, 4). |
| `chat` handler, step 4 | `assembleContext` builds system → LTM → STM → query within `maxTokens` (Chapter 4). |
| `chat` handler, step 5–7 | Calls the mock LLM, saves the assistant turn back to STM, and extracts new facts into LTM via `extractAndStoreFacts` (Chapter 3). |
| `dream` handler | Runs `runDream(userId)` — duplicate removal + eviction (Chapter 6). |
| `health` handler | Simple `{ status: "ok" }` liveness check. |

---

## 2. `src/router/index.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/router/index.ts` |
| Chapter | 07 |
| What it does | Creates an Express `Router` and mounts `GET /api/health`, `POST /api/chat`, `POST /api/dream`. |

### Full code

```ts
import { Router } from "express";
import * as memory from "../controllers/memory.controller";

/** Routes for the agent memory basic code (Lecture 19).
 *
 * POST /api/chat   send a message, get a memory-grounded reply (Chapters 2, 3, 4)
 * POST /api/dream  run background reflection for a user (Chapter 6)
 * GET  /api/health liveness check
 */

const router = Router();

router.get("/health", memory.health);
router.post("/chat", memory.chat);
router.post("/dream", memory.dream);

export default router;
```

---

## 3. `src/index.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/index.ts` |
| Chapter | 07 |
| What it does | Creates the Express app, adds JSON body parsing, mounts the router at `/api`, and starts listening on `config.port`. |

### Full code

```ts
import express from "express";
import { config } from "./config/config";
import router from "./router";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use("/api", router);

app.listen(config.port, () => {
  console.log(`Agent memory basic code listening on http://localhost:${config.port}`);
  console.log(`STM window: ${config.stmWindowSize} turns`);
  console.log(`LTM top-K: ${config.ltmTopK} memories`);
  console.log(`Max context tokens: ${config.maxContextTokens}`);
});

export default app;
```

### Commands

```bash
# Type-check
npm run typecheck

# Start dev server
npm run dev

# Test in another terminal
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' \
  -d '{"userId":"u1","sessionId":"s1","message":"my name is Aminul"}'
curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' \
  -d '{"userId":"u1","sessionId":"s1","message":"What is my name?"}'
curl -X POST http://localhost:3000/api/dream -H 'Content-Type: application/json' \
  -d '{"userId":"u1"}'

# Build and run
npm run build && npm start
```

## End-to-end flow

1. `POST /api/chat` with `{ userId, sessionId, message }`.
2. User turn saved to the session (STM).
3. Last N session messages go to the LLM (sliding window).
4. Top-K relevant facts are fetched from LTM (vector search on deterministic embeddings).
5. Context is assembled: system → LTM → STM → query, inside the token budget.
6. Mock LLM replies; assistant turn saved to STM.
7. New facts are extracted from the user turn and stored in LTM.
8. Optional: `POST /api/dream` removes duplicates and evicts low-value memories.

