import { Request, Response } from "express";
import { z } from "zod";
import { streamWorkspaceChat } from "../services/chat.service";
import { store } from "../store/memory-store";

const chatSchema = z.object({ conversationId: z.string().optional(), message: z.string().min(1), model: z.string().optional() });

// Chapter 3: Streaming RAG chat via SSE (notes 03)
export function chatStream(req: Request, res: Response) {
  const { conversationId, message, model } = chatSchema.parse(req.body);
  const workspaceId = (req.query.workspaceId as string) || "default";
  const userId = (req.query.userId as string) || "user-1";
  streamWorkspaceChat(res, workspaceId, userId, { conversationId, message, model });
}

export function getConversation(req: Request, res: Response) {
  const conversation = store.getConversation(req.params.id);
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });
  res.json(conversation);
}