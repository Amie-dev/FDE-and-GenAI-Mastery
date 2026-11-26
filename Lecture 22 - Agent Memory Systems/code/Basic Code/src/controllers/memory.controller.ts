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

/** Mock LLM (Chapter 1 concept: the model is stateless, the app holds state).
 *
 * This basic code runs without an API key. Replace this with a real LLM call
 * (OpenAI / Anthropic / etc.) when one is available.
 */
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
