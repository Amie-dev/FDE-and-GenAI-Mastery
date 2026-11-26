import type * as express from "express";

/** Express route for GraphRAG + agent memory endpoints. */
export function registerRoutes(app: express.Express): void {
  const router = express.Router();

  router.post("/rag", async (req: express.Request, res: express.Response) => {
    const question = req.body?.question?.trim();
    if (!question) return res.status(400).json({ error: "question required" });

    try {
      const graphRAGService = new GraphRAGService(getDriver());
      const { answer, context } = await graphRAGService.answer(question);
      res.json({ answer, context });
    } catch (err) {
      logger.error("GraphRAG request failed", err as Error);
      res.status(500).json({ error: "Graph retrieval failed" });
    }
  });

  router.get("/rag/context", async (req: express.Request, res: express.Response) => {
    const question = req.query.question?.toString() || "";
    if (!question) return res.status(400).json({ error: "question required" });

    try {
      const graphRAGService = new GraphRAGService(getDriver());
      const { context } = await graphRAGService.answer(question);
      res.json({ context });
    } catch (err) {
      logger.error("GraphRAG context failed", err as Error);
      res.status(500).json({ error: "Graph retrieval failed" });
    }
  });

  router.post("/memory/message", async (req: express.Request, res: express.Response) => {
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

  router.get("/memory/session/:id/messages", async (req: express.Request, res: express.Response) => {
    const recent = agentMemory.recentMessages(req.params.id, config.STM_WINDOW_SIZE);
    res.json({ recent });
  });

  app.use(router);
}