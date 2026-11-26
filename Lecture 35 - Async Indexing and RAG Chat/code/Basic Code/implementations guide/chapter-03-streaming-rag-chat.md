# Chapter 3: Streaming RAG Chat

Based on `notes/03_Streaming_RAG_Chat.md`.

## 3.1 Files involved

- `src/services/chat.service.ts` — RAG retrieval + system prompt + SSE stream
- `src/controllers/chat.controller.ts` — `POST /api/chat` + conversation fetch
- `src/services/indexing.service.ts` — `searchChunks` (retrieval)
- `src/store/memory-store.ts` — conversations & messages

## 3.2 Commands

```bash
curl -N http://localhost:4000/api/chat?workspaceId=ws-1&userId=user-1 \
  -X POST -H 'Content-Type: application/json' \
  -d '{"message":"What is RAG?"}'

curl http://localhost:4000/api/conversations/<id>
```

## 3.3 Full code — src/services/chat.service.ts

```ts
import { Response } from "express";
import { store } from "../store/memory-store";
import { Conversation, Message, ChatCitation, Chunk } from "../types";
import { searchChunks } from "./indexing.service";

export async function streamWorkspaceChat(
  res: Response,
  workspaceId: string,
  userId: string,
  input: { conversationId?: string; message: string; model?: string }
) {
  let conversation: Conversation | undefined;
  if (input.conversationId) conversation = store.getConversation(input.conversationId);
  if (!conversation || conversation.workspaceId !== workspaceId) {
    conversation = store.createConversation({ workspaceId, userId });
  }

  store.addMessage(conversation.id, { conversationId: conversation.id, role: "USER", content: input.message });

  const chunks = searchChunks(workspaceId, input.message, 6);

  const citations: ChatCitation[] = chunks.map((c: Chunk) => ({
    sourceId: c.sourceId,
    sourceTitle: `source_${c.sourceId.slice(0, 6)}`,
    sourceType: "TEXT",
    chunkId: c.id,
    chunkIndex: c.index,
    excerpt: c.content.slice(0, 280),
  }));

  const context = chunks.map((c: Chunk, i: number) => `[${i + 1}] ${c.content}`).join("\n\n") || "No relevant context found.";
  const systemPrompt = `You are a helpful RAG assistant. Use ONLY the retrieved context below for factual claims.\nCite sources inline using [1], [2], etc.\nIf context is insufficient, say so.\n\nRetrieved context:\n${context}`;

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
```

## 3.4 Block-by-block explanation

| Block | What it does |
|-------|--------------|
| Resolve/create conversation | Reuses an existing conversation or creates a new one, scoped to `workspaceId`. |
| Save user message | Appends a `USER` message to the conversation (chat history from the notes). |
| `searchChunks` | RAG retrieval: keyword-overlap search over workspace chunks (topK=6). In production this is a Pinecone vector query. |
| Build citations | Maps retrieved chunks to `ChatCitation[]` with `sourceId`, `excerpt`, `score`, etc. (notes section 3.6). |
| System prompt | Numbers context blocks `[1]`, `[2]`, ... and instructs the model to cite inline using `[n]` (notes section 3.5). |
| SSE stream | Sets `text/event-stream` headers, writes each token as `data: {...}\n\n`, with a small delay to simulate streaming. |
| Save assistant message | On completion (like `onFinish` in the notes), saves the `ASSISTANT` message with its `citations` attached. |

## 3.5 How it works

The client POSTs a message to `/api/chat`. The server retrieves relevant chunks, builds a context prompt, streams the answer token-by-token over SSE, then persists the assistant message with citations. `X-Conversation-Id` header lets the client continue the thread.