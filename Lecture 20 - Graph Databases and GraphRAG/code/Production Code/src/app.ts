import { config } from "../config/config";
import { GraphRAGService } from "../services/graphrag";
import { AgentMemory } from "../services/memory";
import { getDriver } from "../db/driver";
import { logger } from "../middleware/logging";
import * as express from "express";

export const app = express();

app.use(express.json());

const graphRAGService = new GraphRAGService(getDriver());
const agentMemory = new AgentMemory();

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/rag", async (req, res) => {
  const question = req.body?.question?.trim();
  if (!question) return res.status(400).json({ error: "question required" });

  try {
    const { answer, context } = await graphRAGService.answer(question);
    res.json({ answer, context });
  } catch (err) {
    logger.error("GraphRAG request failed", err as Error);
    res.status(500).json({ error: "Graph retrieval failed" });
  }
});

app.get("/rag/context", async (req, res) => {
  const question = req.query.question?.toString() || "";
  if (!question) return res.status(400).json({ error: "question required" });

  try {
    const { context } = await graphRAGService.answer(question);
    res.json({ context });
  } catch (err) {
    logger.error("GraphRAG context failed", err as Error);
    res.status(500).json({ error: "Graph retrieval failed" });
  }
});

app.post("/memory/message", async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message?.content)
    return res.status(400).json({ error: "sessionId and message.content required" });

  agentMemory.appendMessage(sessionId, {
    role: message.role || "user",
    content: message.content,
  });
  const recent = agentMemory.recentMessages(sessionId, config.STM_WINDOW_SIZE);
  res.json({ recent });
});

app.get("/memory/session/:id/messages", async (req, res) => {
  const recent = agentMemory.recentMessages(req.params.id, config.STM_WINDOW_SIZE);
  res.json({ recent });
});

export default app;