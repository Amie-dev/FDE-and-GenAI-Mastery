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