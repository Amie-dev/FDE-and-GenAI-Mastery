import { Response } from "express";
import { store } from "../store/memory-store";
import { Conversation, Message, ChatCitation, Chunk } from "../types";
import { searchChunks } from "./indexing.service";

// Chapter 3: Streaming RAG chat with SSE (notes 03)
export async function streamWorkspaceChat(
  res: Response,
  workspaceId: string,
  userId: string,
  input: { conversationId?: string; message: string; model?: string }
) {
  // 1. Resolve / create conversation
  let conversation: Conversation | undefined;
  if (input.conversationId) conversation = store.getConversation(input.conversationId);
  if (!conversation || conversation.workspaceId !== workspaceId) {
    conversation = store.createConversation({ workspaceId, userId });
  }

  // 2. Save user message
  store.addMessage(conversation.id, { conversationId: conversation.id, role: "USER", content: input.message });

  // 3. RAG retrieval from workspace chunks
  const chunks = searchChunks(workspaceId, input.message, 6);

  // 4. Build citations (Chapter 4)
  const citations: ChatCitation[] = chunks.map((c: Chunk) => ({
    sourceId: c.sourceId,
    sourceTitle: `source_${c.sourceId.slice(0, 6)}`,
    sourceType: "TEXT",
    chunkId: c.id,
    chunkIndex: c.index,
    excerpt: c.content.slice(0, 280),
  }));

  // 5. System prompt with retrieved context (notes 3.5)
  const context = chunks.map((c: Chunk, i: number) => `[${i + 1}] ${c.content}`).join("\n\n") || "No relevant context found.";
  const systemPrompt = `You are a helpful RAG assistant. Use ONLY the retrieved context below for factual claims.\nCite sources inline using [1], [2], etc.\nIf context is insufficient, say so.\n\nRetrieved context:\n${context}`;

  // 6. Stream response via SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Conversation-Id", conversation.id);

  const words = generateAnswer(input.message, context).split(/\s+/);
  let full = "";
  for (const w of words) {
    full += (full ? " " : "") + w;
    res.write(`data: ${JSON.stringify({ token: w + " " })}\n\n`);
    await new Promise((r) => setTimeout(r, 30));
  }

  // 7. Save assistant message with citations (onFinish equivalent)
  store.addMessage(conversation.id, { conversationId: conversation.id, role: "ASSISTANT", content: full.trim(), citations });

  res.write(`data: ${JSON.stringify({ done: true, conversationId: conversation.id })}\n\n`);
  res.end();
}

function generateAnswer(question: string, context: string): string {
  if (!context || context.includes("No relevant context")) {
    return "I don't have enough context in your workspace to answer that. Try uploading a source first.";
  }
  return `Based on your workspace materials, here's the answer to "${question}": the retrieved context covers related concepts. See citations [1]-[${context.split("\n\n").length}] for sources.`;
}