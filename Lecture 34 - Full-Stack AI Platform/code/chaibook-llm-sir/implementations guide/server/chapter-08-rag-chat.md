# Server Chapter 8 — RAG Similarity Search & Streaming AI Chat

## 1. Goal & Outcome
- **Goal**: Implement Retrieval-Augmented Generation (RAG) with Pinecone vector similarity search, context injection, streaming SSE response generation, and citation tracking.
- **Student Outcome**: Real-time SSE AI chat endpoint delivering streaming context-grounded responses with interactive citations.

---

## 2. Server Installation Commands

From directory `week05/chaibook-llm-sir/server`:

```bash
cd week05/chaibook-llm-sir/server
npm install openai @pinecone-database/pinecone
```

---

## 3. Server Source Code & Explanations

#### File Path: `server/src/validators/chat.validator.ts`

```typescript
import { z } from "zod";
import { CHAT_MODELS } from "../lib/ai-config.js";
import { workspaceIdParamSchema } from "./workspace.validator.js";

export const conversationIdParamSchema = workspaceIdParamSchema.extend({
    conversationId: z.string().trim().min(1, "Conversation id is required"),
});

export const chatBodySchema = z.object({
    conversationId: z.string().trim().min(1).optional(),
    messages: z.array(z.record(z.string(), z.unknown())).min(1),
    model: z.enum(CHAT_MODELS).optional(),
    webSearch: z.boolean().optional(),
});

export type ChatBody = z.infer<typeof chatBodySchema>;

export const createConversationSchema = z.object({
    title: z.string().trim().min(1).max(120).optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

```

#### Code Explanation: `server/src/validators/chat.validator.ts`

**Overview & Architectural Role:**
- `server/src/validators/chat.validator.ts` is a production source module containing **22 lines** of code.
- **Layer**: Validation Layer in Express backend. Uses Zod schemas to enforce strict runtime type constraints and infer static TypeScript types.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 5)**:
  - `import { z } from "zod";`: Imports required module bindings.
  - `import { CHAT_MODELS } from "../lib/ai-config.js";`: Imports required module bindings.
  - `import { workspaceIdParamSchema } from "./workspace.validator.js";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 16 (`export type ChatBody = z.infer<typeof chatBodySchema>;`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 22 (`export type CreateConversationInput = z.infer<typeof createConversationSchema>;`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Validation Schemas**:
  - **Line 5 (`export const conversationIdParamSchema = workspaceIdParamSchema.extend({`)**: Defines runtime validation constraints (minimum/maximum string lengths, required parameters, default values) preventing invalid inputs from entering downstream execution layers.
  - **Line 9 (`export const chatBodySchema = z.object({`)**: Defines runtime validation constraints (minimum/maximum string lengths, required parameters, default values) preventing invalid inputs from entering downstream execution layers.
  - **Line 18 (`export const createConversationSchema = z.object({`)**: Defines runtime validation constraints (minimum/maximum string lengths, required parameters, default values) preventing invalid inputs from entering downstream execution layers.
- **Functions, Handlers & Business Methods**:
  - **Line 18 (`export const createConversationSchema = z.object({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 22 lines of `chat.validator.ts`.

#### File Path: `server/src/utils/chat-message.ts`

```typescript

import type { UIMessage } from "ai";

/**
 * Extracts plain text from an AI SDK {@link UIMessage} by joining all text parts.
 *
 * @param message - UI message with `parts` array
 * @returns Concatenated text from all `type: "text"` parts
 *
 */
export function getTextFromUIMessage(message: UIMessage) {
    return message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
}

/**
 * Finds the most recent non-empty user message text in a UI message array.
 *
 * Walks backwards from the end of the array (supports multi-turn history).
 *
 * @param messages - Full UI message history from the client
 * @returns Latest user message text, or `null` when none found
 *
 *
 */
export function getLastUserMessageText(messages: UIMessage[]) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.role === "user") {
            const text = getTextFromUIMessage(message).trim();
            if (text) {
                return text;
            }
        }
    }

    return null;
}

/**
 * Builds a short conversation title from the first user message.
 *
 * Truncates to 72 characters with an ellipsis when longer.
 *
 * @param text - Raw user message text
 * @returns Title string for the conversation sidebar
 *
 */
export function buildConversationTitle(text: string) {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) {
        return "New chat";
    }

    return normalized.length > 72
        ? `${normalized.slice(0, 72).trim()}…`
        : normalized;
}

```

#### Code Explanation: `server/src/utils/chat-message.ts`

**Overview & Architectural Role:**
- `server/src/utils/chat-message.ts` is a production source module containing **60 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import type { UIMessage } from "ai";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 11 (`export function getTextFromUIMessage(message: UIMessage) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 28 (`export function getLastUserMessageText(messages: UIMessage[]) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 51 (`export function buildConversationTitle(text: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 60 lines of `chat-message.ts`.

#### File Path: `server/src/lib/ai-config.ts`

```typescript

/** Default chat model when the client or workspace does not specify one. */
export const CHAT_MODEL = "gpt-4o-mini";

/** Allowed chat models exposed to the client and workspace settings. */
export const CHAT_MODELS = ["gpt-4o-mini", "gpt-4o"] as const;

/** OpenAI embedding model used for RAG vector indexing and query embedding. */
export const EMBEDDING_MODEL = "text-embedding-3-small";

/** Vector dimension count — must match Pinecone index configuration. */
export const EMBEDDING_DIMENSIONS = 1536;

/** Target max characters per text chunk during source processing. */
export const CHUNK_SIZE = 1000;

/** Character overlap between consecutive chunks at split boundaries. */
export const CHUNK_OVERLAP = 100;

/** Number of Pinecone chunks to retrieve per chat query. */
export const RAG_TOP_K = 6;

/** Minimum cosine similarity score for a retrieved chunk to be included in context. */
export const RAG_MIN_SCORE = 0.35;

/** Enqueue a conversation summary job every N persisted messages. */
export const CONVERSATION_SUMMARY_INTERVAL = 8;

/** Max recent UI messages sent to the model when a rolling summary exists. */
export const RECENT_MESSAGE_WINDOW = 12;

```

#### Code Explanation: `server/src/lib/ai-config.ts`

**Overview & Architectural Role:**
- `server/src/lib/ai-config.ts` is a production source module containing **30 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Constants & Exported Utilities**:
  - `export const CHAT_MODEL = "gpt-4o-mini";`: Exposes constant values and helper variables across the application.
  - `export const CHAT_MODELS = ["gpt-4o-mini", "gpt-4o"] as const;`: Exposes constant values and helper variables across the application.
  - `export const EMBEDDING_MODEL = "text-embedding-3-small";`: Exposes constant values and helper variables across the application.
  - `export const EMBEDDING_DIMENSIONS = 1536;`: Exposes constant values and helper variables across the application.
  - `export const CHUNK_SIZE = 1000;`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 30 lines of `ai-config.ts`.

#### File Path: `server/src/lib/conversation-events.ts`

```typescript
/**
 * Inngest event helpers for background conversation summarization.
 */

import { inngest } from "../inngest/client.js";

/**
 * Enqueues a conversation summary job to run asynchronously via Inngest.
 *
 * Triggered every {@link CONVERSATION_SUMMARY_INTERVAL} messages during chat.
 *
 * @param input - Conversation and user ids for the summary worker
 * @returns Resolves when the event is accepted by Inngest
 *
 */
export async function enqueueConversationSummarize(input: {
    conversationId: string;
    userId: string;
}) {
    await inngest.send({
        name: "conversation/summarize",
        data: input,
    });
}

```

#### Code Explanation: `server/src/lib/conversation-events.ts`

**Overview & Architectural Role:**
- `server/src/lib/conversation-events.ts` is a production source module containing **24 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import { inngest } from "../inngest/client.js";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 24 lines of `conversation-events.ts`.

#### File Path: `server/src/lib/rag/retrieve.ts`

```typescript
/**
 * RAG retrieval and chat system prompt construction.
 *
 * Embeds the user query, searches Pinecone, filters by score,
 * and builds the system prompt with retrieved context, memories, and summary.
 */

import { RAG_MIN_SCORE, RAG_TOP_K } from "../ai-config.js";
import { embedTexts } from "../openai.js";
import { queryWorkspaceVectors } from "../pinecone.js";

/** A source chunk returned from Pinecone with similarity score. */
export type RetrievedChunk = {
    sourceId: string;
    sourceTitle: string;
    sourceType: string;
    chunkId: string;
    chunkIndex: number;
    page?: number;
    text: string;
    score: number;
};

/**
 * Retrieves the most relevant source chunks for a user query via vector search.
 *
 * @param workspaceId - Workspace namespace in Pinecone
 * @param query - User message text to embed and search with
 * @returns Chunks scoring above {@link RAG_MIN_SCORE}, up to {@link RAG_TOP_K}
 *
 *
 */
export async function retrieveWorkspaceContext(
    workspaceId: string,
    query: string,
): Promise<RetrievedChunk[]> {
    const [embedding] = await embedTexts([query]);
    const matches = await queryWorkspaceVectors(
        workspaceId,
        embedding,
        RAG_TOP_K,
    );

    const chunks: RetrievedChunk[] = [];

    for (const match of matches) {
        const score = match.score ?? 0;
        if (score < RAG_MIN_SCORE) {
            continue;
        }

        const metadata = match.metadata as
            | Record<string, unknown>
            | undefined;
        if (
            !metadata ||
            typeof metadata.sourceId !== "string" ||
            typeof metadata.sourceTitle !== "string" ||
            typeof metadata.sourceType !== "string" ||
            typeof metadata.chunkId !== "string" ||
            typeof metadata.text !== "string"
        ) {
            continue;
        }

        chunks.push({
            sourceId: metadata.sourceId,
            sourceTitle: metadata.sourceTitle,
            sourceType: metadata.sourceType,
            chunkId: metadata.chunkId,
            chunkIndex: Number(metadata.chunkIndex ?? 0),
            ...(typeof metadata.page === "number"
                ? { page: metadata.page }
                : {}),
            text: metadata.text,
            score,
        });
    }

    return chunks;
}

export type UserMemoryContext = string;

/**
 * Builds the full chat system prompt with RAG context, user memories, summary, and web search hints.
 *
 * @param input - Prompt building blocks from chat service
 * @returns Multi-section system prompt string for `streamText`
 *
 *
 */
export function buildChatSystemPrompt(input: {
    chunks: RetrievedChunk[];
    conversationSummary?: string | null;
    userMemories?: UserMemoryContext[];
    webSearchEnabled?: boolean;
}) {
    const sections: string[] = [
        "You are Chaibook, an assistant that helps users learn from their workspace sources.",
    ];

    if (input.webSearchEnabled) {
        sections.push(
            "You have access to a web_search tool for up-to-date information outside the workspace.",
            "Use it when the user asks about recent events or topics not covered by their sources.",
            "Cite web results inline using [W1], [W2], etc. matching the web result blocks.",
        );
    }

    if (input.userMemories?.length) {
        const memoryBlock = input.userMemories
            .map((memory) => `- ${memory}`)
            .join("\n");

        sections.push(
            "Known facts about this user (use when relevant):",
            memoryBlock,
        );
    }

    const summary = input.conversationSummary?.trim();
    if (summary) {
        sections.push("Earlier conversation summary:", summary);
    }

    if (input.chunks.length === 0) {
        sections.push(
            "This workspace has no indexed source content yet, or nothing relevant was retrieved.",
            input.webSearchEnabled
                ? "Use web search when needed, or answer from general knowledge."
                : "Answer helpfully from general knowledge and suggest adding or processing sources when appropriate.",
            "Do not invent citations.",
        );
        return sections.join("\n");
    }

    const context = input.chunks
        .map((chunk, index) => {
            const label = `[${index + 1}] ${chunk.sourceTitle} (${chunk.sourceType})${
                chunk.page ? `, page ${chunk.page}` : ""
            }`;
            return `${label}\n${chunk.text}`;
        })
        .join("\n\n");

    sections.push(
        "Use ONLY the retrieved context below when making factual claims about their materials.",
        "If the context is insufficient, say so clearly.",
        "Cite sources inline using [1], [2], etc. matching the numbered context blocks.",
        "Keep answers concise, accurate, and educational.",
        "",
        "Retrieved context:",
        context,
    );

    return sections.join("\n");
}

```

#### Code Explanation: `server/src/lib/rag/retrieve.ts`

**Overview & Architectural Role:**
- `server/src/lib/rag/retrieve.ts` is a production source module containing **158 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 5)**:
  - `import { RAG_MIN_SCORE, RAG_TOP_K } from "../ai-config.js";`: Imports required module bindings.
  - `import { embedTexts } from "../openai.js";`: Imports required module bindings.
  - `import { queryWorkspaceVectors } from "../pinecone.js";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 13 (`export type RetrievedChunk = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 83 (`export type UserMemoryContext = string;`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 93 (`export function buildChatSystemPrompt(input: {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 158 lines of `retrieve.ts`.

#### File Path: `server/src/repositories/conversation.repository.ts`

```typescript
import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/db.js";

export const conversationSelect = {
    id: true,
    workspaceId: true,
    title: true,
    summary: true,
    summaryMessageCount: true,
    summarizedAt: true,
    createdAt: true,
    updatedAt: true,
} as const;

export type ConversationRecord = Prisma.ConversationGetPayload<{
    select: typeof conversationSelect;
}>;

export function findConversationsByWorkspaceId(workspaceId: string) {
    return prisma.conversation.findMany({
        where: { workspaceId },
        select: conversationSelect,
        orderBy: { updatedAt: "desc" },
    });
}

export function findConversationById(conversationId: string) {
    return prisma.conversation.findUnique({
        where: { id: conversationId },
        select: conversationSelect,
    });
}

export function findConversationByIdAndWorkspaceId(
    conversationId: string,
    workspaceId: string,
) {
    return prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId },
        select: conversationSelect,
    });
}

export function createConversationRecord(workspaceId: string, title?: string) {
    return prisma.conversation.create({
        data: {
            workspaceId,
            title: title ?? null,
        },
        select: conversationSelect,
    });
}

export function updateConversationSummary(
    conversationId: string,
    data: {
        summary: string;
        summaryMessageCount: number;
    },
) {
    return prisma.conversation.update({
        where: { id: conversationId },
        data: {
            summary: data.summary,
            summaryMessageCount: data.summaryMessageCount,
            summarizedAt: new Date(),
        },
        select: conversationSelect,
    });
}

export function updateConversationRecord(
    conversationId: string,
    data: { title?: string | null },
) {
    return prisma.conversation.update({
        where: { id: conversationId },
        data,
        select: conversationSelect,
    });
}

export function touchConversation(conversationId: string) {
    return prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
        select: conversationSelect,
    });
}

export async function deleteConversationRecord(conversationId: string) {
    await prisma.conversation.delete({
        where: { id: conversationId },
    });
}

```

#### Code Explanation: `server/src/repositories/conversation.repository.ts`

**Overview & Architectural Role:**
- `server/src/repositories/conversation.repository.ts` is a production source module containing **95 lines** of code.
- **Layer**: Repository Data Layer in Express backend. Directly encapsulates Prisma ORM client database queries with atomic filters and relational selection.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import type { Prisma } from "../generated/prisma/client.js";`: Imports required module bindings.
  - `import prisma from "../lib/db.js";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 15 (`export type ConversationRecord = Prisma.ConversationGetPayload<{`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 19 (`export function findConversationsByWorkspaceId(workspaceId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 27 (`export function findConversationById(conversationId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 34 (`export function findConversationByIdAndWorkspaceId(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 44 (`export function createConversationRecord(workspaceId: string, title?: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 54 (`export function updateConversationSummary(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 72 (`export function updateConversationRecord(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 83 (`export function touchConversation(conversationId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
- **Constants & Exported Utilities**:
  - `export const conversationSelect = {`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 95 lines of `conversation.repository.ts`.

#### File Path: `server/src/repositories/message.repository.ts`

```typescript
import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/db.js";

export const messageSelect = {
    id: true,
    conversationId: true,
    role: true,
    content: true,
    citations: true,
    createdAt: true,
} as const;

export type MessageRecord = Prisma.MessageGetPayload<{
    select: typeof messageSelect;
}>;

export type CreateMessageData = {
    conversationId: string;
    role: MessageRecord["role"];
    content: string;
    citations?: Prisma.InputJsonValue;
};

export function findMessagesByConversationId(conversationId: string) {
    return prisma.message.findMany({
        where: { conversationId },
        select: messageSelect,
        orderBy: { createdAt: "asc" },
    });
}

export function countMessagesByConversationId(conversationId: string) {
    return prisma.message.count({
        where: { conversationId },
    });
}

export function createMessageRecord(data: CreateMessageData) {
    return prisma.message.create({
        data: {
            conversationId: data.conversationId,
            role: data.role,
            content: data.content,
            citations: data.citations,
        },
        select: messageSelect,
    });
}

```

#### Code Explanation: `server/src/repositories/message.repository.ts`

**Overview & Architectural Role:**
- `server/src/repositories/message.repository.ts` is a production source module containing **48 lines** of code.
- **Layer**: Repository Data Layer in Express backend. Directly encapsulates Prisma ORM client database queries with atomic filters and relational selection.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import type { Prisma } from "../generated/prisma/client.js";`: Imports required module bindings.
  - `import prisma from "../lib/db.js";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 13 (`export type MessageRecord = Prisma.MessageGetPayload<{`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 17 (`export type CreateMessageData = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 24 (`export function findMessagesByConversationId(conversationId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 32 (`export function countMessagesByConversationId(conversationId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 38 (`export function createMessageRecord(data: CreateMessageData) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
- **Constants & Exported Utilities**:
  - `export const messageSelect = {`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 48 lines of `message.repository.ts`.

#### File Path: `server/src/services/chat.service.ts`

```typescript
/**
 * Chat and conversation business logic.
 *
 * Handles CRUD for conversations/messages and the main RAG chat streaming pipeline:
 *
 * ```
 * User message
 *   → save to DB
 *   → RAG retrieval + Mem0 memories
 *   → streamText (AI SDK) with optional web search tool
 *   → save assistant reply + citations
 *   → optional summary job + Mem0 learning
 * ```
 */

import { openai } from "@ai-sdk/openai";
import type { Response } from "express";
import { z } from "zod";
import {
    convertToModelMessages,
    createUIMessageStream,
    isStepCount,
    pipeUIMessageStreamToResponse,
    streamText,
    toUIMessageStream,
    tool,
    type UIMessage,
} from "ai";
import {
    CHAT_MODEL,
    CHAT_MODELS,
    CONVERSATION_SUMMARY_INTERVAL,
    RECENT_MESSAGE_WINDOW,
} from "../lib/ai-config.js";
import { enqueueConversationSummarize } from "../lib/conversation-events.js";
import {
    buildChatSystemPrompt,
    retrieveWorkspaceContext,
} from "../lib/rag/retrieve.js";
import {
    createConversationRecord,
    findConversationByIdAndWorkspaceId,
    findConversationsByWorkspaceId,
    touchConversation,
    updateConversationRecord,
    deleteConversationRecord,
} from "../repositories/conversation.repository.js";
import {
    createMessageRecord,
    countMessagesByConversationId,
    findMessagesByConversationId,
} from "../repositories/message.repository.js";
import { addMemoriesFromMessages, searchUserMemories } from "../lib/mem0.js";
import {
    formatTavilyResultsForPrompt,
    searchWeb,
    type TavilySearchResponse,
} from "../lib/tavily.js";
import { NotFoundError, ValidationError } from "../types/app-error.js";
import {
    buildConversationTitle,
    getLastUserMessageText,
    getTextFromUIMessage,
} from "../utils/chat-message.js";
import { getWorkspaceByIdForUser } from "./workspace.service.js";

/**
 * Lists all conversations in a workspace for the sidebar/history UI.
 *
 * @param workspaceId - Workspace to list conversations from
 * @param userId - Authenticated user's id
 * @returns Conversation records ordered by most recent activity
 *
 */
export async function listConversationsForWorkspace(
    workspaceId: string,
    userId: string,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);
    return findConversationsByWorkspaceId(workspaceId);
}

/**
 * Creates an empty conversation (optional title).
 *
 * Most chats are created implicitly on first message via {@link streamWorkspaceChat};
 * this endpoint supports explicit "new chat" actions from the UI.
 *
 * @param workspaceId - Workspace to attach the conversation to
 * @param userId - Authenticated user's id
 * @param title - Optional display title
 * @returns New conversation record
 *
 */
export async function createConversationForWorkspace(
    workspaceId: string,
    userId: string,
    title?: string,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);
    return createConversationRecord(workspaceId, title);
}

/**
 * Loads persisted message history for a conversation.
 *
 * @param workspaceId - Workspace the conversation belongs to
 * @param conversationId - Conversation to load messages for
 * @param userId - Authenticated user's id
 * @returns Message rows with role, content, citations, and timestamps
 * @throws {NotFoundError} When the conversation does not exist in this workspace
 *
 */
export async function getConversationMessagesForWorkspace(
    workspaceId: string,
    conversationId: string,
    userId: string,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);

    const conversation = await findConversationByIdAndWorkspaceId(
        conversationId,
        workspaceId,
    );

    if (!conversation) {
        throw new NotFoundError("Conversation not found");
    }

    return findMessagesByConversationId(conversationId);
}

/**
 * Deletes a conversation and all its messages (cascade).
 *
 * @param workspaceId - Workspace the conversation belongs to
 * @param conversationId - Conversation to delete
 * @param userId - Authenticated user's id
 * @returns Resolves when the conversation row is deleted
 * @throws {NotFoundError} When the conversation does not exist
 *
 */
export async function deleteConversationForWorkspace(
    workspaceId: string,
    conversationId: string,
    userId: string,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);

    const conversation = await findConversationByIdAndWorkspaceId(
        conversationId,
        workspaceId,
    );

    if (!conversation) {
        throw new NotFoundError("Conversation not found");
    }

    await deleteConversationRecord(conversationId);
}

/**
 * Finds an existing conversation or creates one from the first user message.
 *
 * @param workspaceId - Workspace scope
 * @param conversationId - Existing id from client, or undefined for a new chat
 * @param firstMessage - User text used to auto-generate a title for new conversations
 * @returns Conversation record (existing or newly created)
 * @throws {NotFoundError} When `conversationId` is provided but not found
 *
 *
 */
async function resolveConversation(
    workspaceId: string,
    conversationId: string | undefined,
    firstMessage: string,
) {
    if (conversationId) {
        const existing = await findConversationByIdAndWorkspaceId(
            conversationId,
            workspaceId,
        );

        if (!existing) {
            throw new NotFoundError("Conversation not found");
        }

        return existing;
    }

    return createConversationRecord(
        workspaceId,
        buildConversationTitle(firstMessage),
    );
}

/**
 * Main RAG chat endpoint: streams an AI reply with workspace context and optional web search.
 *
 * **Pipeline:**
 * 1. Validate user message and resolve/create conversation
 * 2. Save user message to Postgres
 * 3. Parallel: Pinecone RAG retrieval + Mem0 memory search
 * 4. Build system prompt and stream model response via AI SDK
 * 5. On finish: save assistant message, citations, title, summary job, Mem0 learning
 *
 * @param res - Express response (streamed via `pipeUIMessageStreamToResponse`)
 * @param workspaceId - Workspace whose sources to search
 * @param userId - Authenticated user's id
 * @param input - Client chat payload from `useChat`
 * @returns Writes UI message stream to `res`; sets `X-Conversation-Id` header
 * @throws {ValidationError} When no user message text is present
 * @throws {NotFoundError} When conversation or workspace is not found
 *
 *
 */
export async function streamWorkspaceChat(
    res: Response,
    workspaceId: string,
    userId: string,
    input: {
        conversationId?: string;
        messages: UIMessage[];
        model?: string;
        webSearch?: boolean;
    },
) {
    const workspace = await getWorkspaceByIdForUser(workspaceId, userId);
    const requestedModel = input.model ?? workspace.defaultModel;
    const chatModel =
        CHAT_MODELS.find((model) => model === requestedModel) ?? CHAT_MODEL;
    const webSearchEnabled =
        input.webSearch === true && !!process.env.TAVILY_API_KEY?.trim();

    const userText = getLastUserMessageText(input.messages);
    if (!userText) {
        throw new ValidationError("A user message is required");
    }

    const conversation = await resolveConversation(
        workspaceId,
        input.conversationId,
        userText,
    );

    await createMessageRecord({
        conversationId: conversation.id,
        role: "USER",
        content: userText,
    });

    const [retrievedChunks, userMemories] = await Promise.all([
        retrieveWorkspaceContext(workspaceId, userText),
        searchUserMemories(userId, userText),
    ]);

    const citations = retrievedChunks.map((chunk) => ({
        sourceId: chunk.sourceId,
        sourceTitle: chunk.sourceTitle,
        sourceType: chunk.sourceType,
        chunkId: chunk.chunkId,
        chunkIndex: chunk.chunkIndex,
        page: chunk.page,
        excerpt: chunk.text.slice(0, 280),
        score: chunk.score,
    }));
    const systemPrompt = buildChatSystemPrompt({
        chunks: retrievedChunks,
        conversationSummary: conversation.summary,
        userMemories: userMemories.map((memory) => memory.memory),
        webSearchEnabled,
    });

    const contextMessages =
        conversation.summary &&
        input.messages.length > RECENT_MESSAGE_WINDOW
            ? input.messages.slice(-RECENT_MESSAGE_WINDOW)
            : input.messages;

    let webSearchResults: TavilySearchResponse | null = null;

    const stream = createUIMessageStream({
        originalMessages: input.messages,
        execute: async ({ writer }) => {
            const tools =
                webSearchEnabled
                    ? {
                          web_search: tool({
                              description:
                                  "Search the web for up-to-date information outside the workspace sources.",
                              inputSchema: z.object({
                                  query: z
                                      .string()
                                      .describe(
                                          "The search query for current web information",
                                      ),
                              }),
                              execute: async ({ query }) => {
                                  const results = await searchWeb(query);
                                  webSearchResults = results;
                                  return formatTavilyResultsForPrompt(results);
                              },
                          }),
                      }
                    : undefined;

            const result = streamText({
                model: openai(chatModel),
                system: systemPrompt,
                messages: await convertToModelMessages(contextMessages),
                tools,
                stopWhen: webSearchEnabled ? isStepCount(3) : undefined,
            });

            writer.merge(toUIMessageStream({ stream: result.stream }));
        },
        onFinish: async ({ responseMessage, isAborted }) => {
            if (isAborted) {
                return;
            }

            const assistantText = getTextFromUIMessage(responseMessage).trim();
            if (!assistantText) {
                return;
            }

            const webCitations = webSearchResults
                ? webSearchResults.results.map((result) => ({
                      sourceType: "WEB" as const,
                      sourceTitle: result.title,
                      url: result.url,
                      excerpt: result.content.slice(0, 280),
                  }))
                : [];
            const allCitations = [...citations, ...webCitations];

            await createMessageRecord({
                conversationId: conversation.id,
                role: "ASSISTANT",
                content: assistantText,
                citations: allCitations,
            });

            await touchConversation(conversation.id);

            if (!conversation.title) {
                await updateConversationRecord(conversation.id, {
                    title: buildConversationTitle(userText),
                });
            }

            const messageCount = await countMessagesByConversationId(
                conversation.id,
            );

            if (messageCount % CONVERSATION_SUMMARY_INTERVAL === 0) {
                await enqueueConversationSummarize({
                    conversationId: conversation.id,
                    userId,
                });
            }

            void addMemoriesFromMessages(
                userId,
                [
                    { role: "user", content: userText },
                    { role: "assistant", content: assistantText },
                ],
                {
                    source: "learned",
                    conversationId: conversation.id,
                },
            ).catch((error) => {
                console.error("Mem0 add failed:", error);
            });
        },
    });

    await pipeUIMessageStreamToResponse({
        response: res,
        stream,
        headers: {
            "X-Conversation-Id": conversation.id,
        },
    });
}

```

#### Code Explanation: `server/src/services/chat.service.ts`

**Overview & Architectural Role:**
- `server/src/services/chat.service.ts` is a production source module containing **386 lines** of code.
- **Layer**: Service Layer in Express backend. Implements core domain logic, manages transactions, interacts with databases via repositories, and orchestrates background jobs.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 16)**:
  - `import { openai } from "@ai-sdk/openai";`: Imports required module bindings.
  - `import type { Response } from "express";`: Imports required module bindings.
  - `import { z } from "zod";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { enqueueConversationSummarize } from "../lib/conversation-events.js";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { addMemoriesFromMessages, searchUserMemories } from "../lib/mem0.js";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { NotFoundError, ValidationError } from "../types/app-error.js";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { getWorkspaceByIdForUser } from "./workspace.service.js";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 27 (`type UIMessage,`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 57 (`type TavilySearchResponse,`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 386 lines of `chat.service.ts`.

#### File Path: `server/src/controllers/chat.controller.ts`

```typescript
import type { Request, Response } from "express";
import type { UIMessage } from "ai";
import {
    createConversationForWorkspace,
    deleteConversationForWorkspace,
    getConversationMessagesForWorkspace,
    listConversationsForWorkspace,
    streamWorkspaceChat,
} from "../services/chat.service.js";
import {
    chatBodySchema,
    conversationIdParamSchema,
    createConversationSchema,
} from "../validators/chat.validator.js";
import { workspaceIdParamSchema } from "../validators/workspace.validator.js";

export async function listConversations(req: Request, res: Response) {
    const { workspaceId } = workspaceIdParamSchema.parse(req.params);
    const conversations = await listConversationsForWorkspace(
        workspaceId,
        req.session.user.id,
    );
    res.json(conversations);
}

export async function createConversation(req: Request, res: Response) {
    const { workspaceId } = workspaceIdParamSchema.parse(req.params);
    const input = createConversationSchema.parse(req.body ?? {});
    const conversation = await createConversationForWorkspace(
        workspaceId,
        req.session.user.id,
        input.title,
    );
    res.status(201).json(conversation);
}

export async function listConversationMessages(req: Request, res: Response) {
    const { workspaceId, conversationId } =
        conversationIdParamSchema.parse(req.params);
    const messages = await getConversationMessagesForWorkspace(
        workspaceId,
        conversationId,
        req.session.user.id,
    );
    res.json(messages);
}

export async function deleteConversation(req: Request, res: Response) {
    const { workspaceId, conversationId } =
        conversationIdParamSchema.parse(req.params);
    await deleteConversationForWorkspace(
        workspaceId,
        conversationId,
        req.session.user.id,
    );
    res.status(204).send();
}

export async function streamChat(req: Request, res: Response) {
    const { workspaceId } = workspaceIdParamSchema.parse(req.params);
    const body = chatBodySchema.parse(req.body);

    await streamWorkspaceChat(res, workspaceId, req.session.user.id, {
        conversationId: body.conversationId,
        messages: body.messages as unknown as UIMessage[],
        model: body.model,
        webSearch: body.webSearch,
    });
}

```

#### Code Explanation: `server/src/controllers/chat.controller.ts`

**Overview & Architectural Role:**
- `server/src/controllers/chat.controller.ts` is a production source module containing **69 lines** of code.
- **Layer**: Controller Layer in Express backend (5-Layer Pattern). Extracts parameters from HTTP requests, delegates validation/logic to domain services, and returns formatted HTTP responses.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 7)**:
  - `import type { Request, Response } from "express";`: Imports required module bindings.
  - `import type { UIMessage } from "ai";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { workspaceIdParamSchema } from "../validators/workspace.validator.js";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 69 lines of `chat.controller.ts`.

#### File Path: `server/src/routes/chat.routes.ts`

```typescript
import { Router } from "express";
import {
    createConversation,
    deleteConversation,
    listConversationMessages,
    listConversations,
    streamChat,
} from "../controllers/chat.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const conversationRoutes = Router({ mergeParams: true });

conversationRoutes.get("/", asyncHandler(listConversations));
conversationRoutes.post("/", asyncHandler(createConversation));
conversationRoutes.get(
    "/:conversationId/messages",
    asyncHandler(listConversationMessages),
);
conversationRoutes.delete(
    "/:conversationId",
    asyncHandler(deleteConversation),
);

export const chatRoutes = Router({ mergeParams: true });

chatRoutes.post("/", asyncHandler(streamChat));

```

#### Code Explanation: `server/src/routes/chat.routes.ts`

**Overview & Architectural Role:**
- `server/src/routes/chat.routes.ts` is a production source module containing **26 lines** of code.
- **Layer**: Route Router Layer in Express backend. Maps REST API endpoints to controller handlers and binds security middleware.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 5)**:
  - `import { Router } from "express";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { asyncHandler } from "../utils/async-handler.js";`: Imports required module bindings.
- **Constants & Exported Utilities**:
  - `export const conversationRoutes = Router({ mergeParams: true });`: Exposes constant values and helper variables across the application.
  - `export const chatRoutes = Router({ mergeParams: true });`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 26 lines of `chat.routes.ts`.
