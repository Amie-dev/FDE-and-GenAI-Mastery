# Chapter 07 — Routes

**Notes source:** `notes/06_GraphRAG_Hybrid_Retrieval.md`, `notes/08_End_to_End_Cognitive_Memory_App.md`

**Goal:** Wire HTTP endpoints to the GraphRAG service and Agent Memory service.

---

## 1. `src/routes/index.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/routes/index.ts` |
| Chapter | 07 (supports Chapter 08) |
| What it does | Creates Express routers for `/rag` and `/memory`. |

### Full code

```ts
import { Router, Request, Response } from "express";
import { GraphRAGService } from "../services/graphrag";
import { AgentMemory } from "../services/memory";
import { getDriver } from "../db/driver";

const router = Router();

const graphRAGService = new GraphRAGService(getDriver());
const agentMemory = new AgentMemory();

router.post("/rag", async (req: Request, res: Response) => {
  const question = req.body?.question?.trim();
  if (!question) return res.status(400).json({ error: "question required" });

  const { answer, context } = await graphRAGService.answer(question);
  // Placeholder LLM response — replace with actual LLM call.
  res.json({ answer, context });
});

router.get("/rag/context", async (req: Request, res: Response) => {
  const question = req.query.question?.toString() || "";
  if (!question) return res.status(400).json({ error: "question required" });
  const { context } = await graphRAGService.answer(question);
  res.json({ context });
});

router.post("/memory/message", async (req: Request, res: Response) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message?.content)
    return res.status(400).json({ error: "sessionId and message.content required" });
  agentMemory.appendMessage(sessionId, { role: message.role || "user", content: message.content });
  const recent = agentMemory.recentMessages(sessionId, 6);
  res.json({ recent });
});

router.get("/memory/session/:id/messages", async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const recent = agentMemory.recentMessages(sessionId, 6);
  res.json({ recent });
});

export default router;
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `router.post("/rag", ...)` | Validates question, calls `graphRAGService.answer`, returns JSON with answer + context. |
| `router.get("/rag/context", ...)` | Same pipeline, returns only context. |
| `router.post("/memory/message", ...)` | Appends to in-memory STM and returns recent messages. |
| `router.get("/memory/session/:id/messages", ...)` | Returns recent STM messages for a session. |
| `export default router` | Mountable Express Router used by `app.ts`. |

### Command

```bash
npm run typecheck
```

### Self-check

1. Why validate the question before calling the service? → security / robustness.