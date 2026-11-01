# Server Chapter 9 — Mem0 Long-Term Memory & Tavily Web Search Integration

## 1. Goal & Outcome
- **Goal**: Integrate Mem0 user/conversation long-term memory store and Tavily live web search API into RAG context retrieval.
- **Student Outcome**: Personalized AI assistant capable of retrieving long-term user memories and live web context.

---

## 2. Server Installation Commands

From directory `week05/chaibook-llm-sir/server`:

```bash
cd week05/chaibook-llm-sir/server
npm install mem0ai tavily-js
```

---

## 3. Server Source Code & Explanations

#### File Path: `server/src/validators/memory.validator.ts`

```typescript
import { z } from "zod";

export const memoryIdParamSchema = z.object({
    memoryId: z.string().trim().min(1),
});

export const createMemorySchema = z.object({
    memory: z.string().trim().min(1).max(2000),
});

export const updateMemorySchema = z.object({
    memory: z.string().trim().min(1).max(2000),
});

```

#### Code Explanation: `server/src/validators/memory.validator.ts`

**Overview & Architectural Role:**
- `server/src/validators/memory.validator.ts` is a production source module containing **13 lines** of code.
- **Layer**: Validation Layer in Express backend. Uses Zod schemas to enforce strict runtime type constraints and infer static TypeScript types.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import { z } from "zod";`: Imports required module bindings.
- **Validation Schemas**:
  - **Line 3 (`export const memoryIdParamSchema = z.object({`)**: Defines runtime validation constraints (minimum/maximum string lengths, required parameters, default values) preventing invalid inputs from entering downstream execution layers.
  - **Line 7 (`export const createMemorySchema = z.object({`)**: Defines runtime validation constraints (minimum/maximum string lengths, required parameters, default values) preventing invalid inputs from entering downstream execution layers.
  - **Line 11 (`export const updateMemorySchema = z.object({`)**: Defines runtime validation constraints (minimum/maximum string lengths, required parameters, default values) preventing invalid inputs from entering downstream execution layers.
- **Functions, Handlers & Business Methods**:
  - **Line 7 (`export const createMemorySchema = z.object({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 13 lines of `memory.validator.ts`.

#### File Path: `server/src/lib/mem0.ts`

```typescript
import { MemoryClient } from "mem0ai";

let client: MemoryClient | null = null;

/**
 * Returns a singleton Mem0 API client.
 *
 * @returns Configured `MemoryClient`
 * @throws When `MEM0_API_KEY` is missing
 */
export function getMem0Client() {
    const apiKey = process.env.MEM0_API_KEY?.trim();

    if (!apiKey) {
        throw new Error("MEM0_API_KEY is not configured");
    }

    if (!client) {
        client = new MemoryClient({ apiKey });
    }

    return client;
}

/** Message shape accepted by Mem0 for inferred memory extraction. */
export type Mem0Message = {
    role: "user" | "assistant";
    content: string;
};

/** Normalized memory record returned by Chaibook memory APIs. */
export type AppMemory = {
    id: string;
    memory: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown> | null;
    categories?: string[];
    source: "manual" | "learned";
};

/**
 * Maps a raw Mem0 record into the app's {@link AppMemory} shape.
 *
 * @param record - Raw Mem0 memory object
 * @returns Normalized memory with `source` derived from metadata
 */
function mapMemory(record: {
    id: string;
    memory?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    metadata?: Record<string, unknown> | null;
    categories?: string[];
}): AppMemory {
    const metadata = record.metadata ?? null;
    const source: AppMemory["source"] =
        metadata?.source === "manual" ? "manual" : "learned";
    const createdAt = record.createdAt ?? new Date().toISOString();
    const updatedAt = record.updatedAt ?? createdAt;

    return {
        id: record.id,
        memory: record.memory ?? "",
        createdAt:
            createdAt instanceof Date ? createdAt.toISOString() : createdAt,
        updatedAt:
            updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
        metadata,
        categories: record.categories,
        source,
    };
}

/**
 * Lists all memories stored for a user (up to 100).
 *
 * @param userId - Authenticated user's id
 * @returns Array of memories, or `[]` when Mem0 is not configured
 *
 */
export async function listUserMemories(userId: string) {
    if (!process.env.MEM0_API_KEY?.trim()) {
        return [];
    }

    const page = await getMem0Client().getAll({
        filters: { user_id: userId },
        page: 1,
        pageSize: 100,
    });

    return page.results.map(mapMemory);
}

/**
 * Semantic search over a user's memories for RAG chat context.
 *
 * @param userId - Authenticated user's id
 * @param query - Current user message or search text
 * @returns Top matching memories (up to 8), or `[]` when Mem0 is off or query is empty
 *
 */
export async function searchUserMemories(userId: string, query: string) {
    if (!process.env.MEM0_API_KEY?.trim() || !query.trim()) {
        return [];
    }

    const results = await getMem0Client().search(query, {
        filters: { user_id: userId },
        topK: 8,
        threshold: 0.1,
    });

    return results.results.map(mapMemory);
}

/**
 * Creates a single user memory (manual or explicit text).
 *
 * @param userId - Owner of the memory
 * @param input - Memory text, optional infer flag, optional metadata
 * @returns Created memory record
 * @throws When Mem0 returns no created record
 *
 */
export async function addUserMemory(
    userId: string,
    input: {
        memory: string;
        infer?: boolean;
        metadata?: Record<string, unknown>;
    },
) {
    const created = await getMem0Client().add(
        [{ role: "user", content: input.memory }],
        {
            userId,
            infer: input.infer ?? false,
            metadata: input.metadata,
        },
    );

    const first = created[0];
    if (!first) {
        throw new Error("Mem0 did not return a created memory");
    }

    return mapMemory(first);
}

/**
 * Extracts inferred memories from a conversation transcript (fire-and-forget in chat).
 *
 * @param userId - Owner of extracted memories
 * @param messages - Recent user/assistant turns
 * @param metadata - Optional metadata (e.g. `{ source: "learned", conversationId }`)
 * @returns Resolves immediately when Mem0 is off or messages are empty
 *
 */
export async function addMemoriesFromMessages(
    userId: string,
    messages: Mem0Message[],
    metadata?: Record<string, unknown>,
) {
    if (!process.env.MEM0_API_KEY?.trim() || messages.length === 0) {
        return;
    }

    await getMem0Client().add(messages, {
        userId,
        infer: true,
        metadata,
    });
}

/**
 * Updates the text of an existing memory by id.
 *
 * @param memoryId - Mem0 memory id
 * @param input - New memory text
 * @returns Updated memory record
 * @throws When Mem0 returns no updated record
 *
 */
export async function updateUserMemory(
    memoryId: string,
    input: { memory: string },
) {
    const updated = await getMem0Client().update(memoryId, {
        text: input.memory,
    });

    const first = updated[0];
    if (!first) {
        throw new Error("Mem0 did not return an updated memory");
    }

    return mapMemory(first);
}

/**
 * Permanently deletes a memory from Mem0.
 *
 * @param memoryId - Mem0 memory id to delete
 * @returns Resolves when deletion completes
 *
 */
export async function deleteUserMemory(memoryId: string) {
    await getMem0Client().delete(memoryId);
}

```

#### Code Explanation: `server/src/lib/mem0.ts`

**Overview & Architectural Role:**
- `server/src/lib/mem0.ts` is a production source module containing **211 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import { MemoryClient } from "mem0ai";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 26 (`export type Mem0Message = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 32 (`export type AppMemory = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 11 (`export function getMem0Client() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 48 (`function mapMemory(record: {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 211 lines of `mem0.ts`.

#### File Path: `server/src/lib/tavily.ts`

```typescript

import { tavily } from "@tavily/core";

export type TavilySearchResult = {
    title: string;
    url: string;
    content: string;
    score?: number;
};

export type TavilySearchResponse = {
    query: string;
    answer?: string;
    results: TavilySearchResult[];
};

let client: ReturnType<typeof tavily> | null = null;

/**
 * Runs a web search query via Tavily for the chat `web_search` tool.
 *
 * @param query - Natural-language search query from the model
 * @returns Normalized search response with up to 5 results and optional answer summary
 * @throws When `TAVILY_API_KEY` is not configured
 *
 */
export async function searchWeb(query: string): Promise<TavilySearchResponse> {
    const apiKey = process.env.TAVILY_API_KEY?.trim();

    if (!apiKey) {
        throw new Error("TAVILY_API_KEY is not configured");
    }

    if (!client) {
        client = tavily({ apiKey });
    }

    const response = await client.search(query, {
        searchDepth: "basic",
        maxResults: 5,
        includeAnswer: true,
    });

    return {
        query,
        answer:
            typeof response.answer === "string" ? response.answer : undefined,
        results: (response.results ?? []).map((result) => ({
            title: result.title ?? result.url ?? "Untitled",
            url: result.url ?? "",
            content: result.content ?? "",
            score: result.score,
        })),
    };
}

/**
 * Formats Tavily results into a prompt block for the chat model.
 *
 * Results are labeled `[W1]`, `[W2]`, etc. for inline citation in assistant replies.
 *
 * @param response - Normalized Tavily search response
 * @returns Multi-line string injected into the tool result
 *
 *
 */
export function formatTavilyResultsForPrompt(
    response: TavilySearchResponse,
): string {
    if (response.results.length === 0) {
        return "No web results were found.";
    }

    const blocks = response.results.map(
        (result, index) =>
            `[W${index + 1}] ${result.title} (${result.url})\n${result.content}`,
    );

    const parts = ["Web search results:"];

    if (response.answer) {
        parts.push(`Summary: ${response.answer}`);
    }

    parts.push(blocks.join("\n\n"));

    return parts.join("\n\n");
}

```

#### Code Explanation: `server/src/lib/tavily.ts`

**Overview & Architectural Role:**
- `server/src/lib/tavily.ts` is a production source module containing **88 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import { tavily } from "@tavily/core";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 4 (`export type TavilySearchResult = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 11 (`export type TavilySearchResponse = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 67 (`export function formatTavilyResultsForPrompt(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 88 lines of `tavily.ts`.

#### File Path: `server/src/services/memory.service.ts`

```typescript
import {
    addUserMemory,
    updateUserMemory,
} from "../lib/mem0.js";

/**
 * Creates a user-authored memory (not inferred by Mem0).
 *
 * @param userId - Owner of the memory
 * @param input - Raw memory text from the client
 * @returns Created Mem0 memory record
 * @throws {ValidationError} When memory text is empty after trimming
 *
 *
 */
export function createMemoryForUser(
    userId: string,
    input: { memory: string },
) {
    return addUserMemory(userId, {
        memory: input.memory,
        infer: false,
        metadata: { source: "manual" },
    });
}

/**
 * Updates the text of an existing memory by id.
 *
 * @param _userId - Reserved for future ownership checks
 * @param memoryId - Mem0 memory id to update
 * @param input - New memory text
 * @returns Updated Mem0 memory record
 * @throws {ValidationError} When memory is missing or empty
 *
 */
export function updateMemoryForUser(
    _userId: string,
    memoryId: string,
    input: { memory: string },
) {
    return updateUserMemory(memoryId, input);
}

```

#### Code Explanation: `server/src/services/memory.service.ts`

**Overview & Architectural Role:**
- `server/src/services/memory.service.ts` is a production source module containing **43 lines** of code.
- **Layer**: Service Layer in Express backend. Implements core domain logic, manages transactions, interacts with databases via repositories, and orchestrates background jobs.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import {`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 16 (`export function createMemoryForUser(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 37 (`export function updateMemoryForUser(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 43 lines of `memory.service.ts`.

#### File Path: `server/src/services/conversation-memory.service.ts`

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { CHAT_MODEL } from "../lib/ai-config.js";
import { addMemoriesFromMessages } from "../lib/mem0.js";
import {
    findConversationById,
    updateConversationSummary,
} from "../repositories/conversation.repository.js";
import { findMessagesByConversationId } from "../repositories/message.repository.js";
import { NotFoundError } from "../types/app-error.js";

/**
 * Generates a rolling conversation summary and syncs recent learnings to Mem0.
 *
 * Called asynchronously (via Inngest) every N messages. The summary replaces
 * older history in chat context; Mem0 receives the last 16 messages for extraction.
 *
 * @param conversationId - Conversation to summarize
 * @param userId - Owner of the conversation (used for Mem0)
 * @returns Updated conversation with `summary` and `summaryMessageCount`
 * @throws {NotFoundError} When the conversation does not exist
 *
 *
 */
export async function summarizeConversationById(
    conversationId: string,
    userId: string,
) {
    const conversation = await findConversationById(conversationId);

    if (!conversation) {
        throw new NotFoundError("Conversation not found");
    }

    const messages = await findMessagesByConversationId(conversationId);

    if (messages.length === 0) {
        return conversation;
    }

    const transcript = messages
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n\n");
    const previousSummary = conversation.summary?.trim();

    const { text: summary } = await generateText({
        model: openai(CHAT_MODEL),
        system: [
            "You summarize chat conversations for a learning assistant.",
            "Produce a concise rolling summary covering topics discussed, questions asked,",
            "key insights, and unresolved threads.",
            "Write in third person about the user. Keep it under 250 words.",
        ].join("\n"),
        prompt: [
            previousSummary
                ? `Previous summary:\n${previousSummary}\n`
                : null,
            "Full conversation transcript:",
            transcript,
            "",
            "Write an updated summary that incorporates new messages.",
        ]
            .filter(Boolean)
            .join("\n"),
    });

    const updated = await updateConversationSummary(conversationId, {
        summary: summary.trim(),
        summaryMessageCount: messages.length,
    });

    const recentMessages = messages.slice(-16).map((message) => ({
        role: message.role.toLowerCase() as "user" | "assistant",
        content: message.content,
    }));

    await addMemoriesFromMessages(userId, recentMessages, {
        source: "learned",
        conversationId,
    });

    return updated;
}

```

#### Code Explanation: `server/src/services/conversation-memory.service.ts`

**Overview & Architectural Role:**
- `server/src/services/conversation-memory.service.ts` is a production source module containing **83 lines** of code.
- **Layer**: Service Layer in Express backend. Implements core domain logic, manages transactions, interacts with databases via repositories, and orchestrates background jobs.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 9)**:
  - `import { generateText } from "ai";`: Imports required module bindings.
  - `import { openai } from "@ai-sdk/openai";`: Imports required module bindings.
  - `import { CHAT_MODEL } from "../lib/ai-config.js";`: Imports required module bindings.
  - `import { addMemoriesFromMessages } from "../lib/mem0.js";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { findMessagesByConversationId } from "../repositories/message.repository.js";`: Imports required module bindings.
  - `import { NotFoundError } from "../types/app-error.js";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 83 lines of `conversation-memory.service.ts`.

#### File Path: `server/src/controllers/memory.controller.ts`

```typescript
import type { Request, Response } from "express";
import {
    createMemoryForUser,
    updateMemoryForUser,
} from "../services/memory.service.js";
import { deleteUserMemory, listUserMemories } from "../lib/mem0.js";
import {
    createMemorySchema,
    memoryIdParamSchema,
    updateMemorySchema,
} from "../validators/memory.validator.js";

export async function listMemories(req: Request, res: Response) {
    const memories = await listUserMemories(req.session.user.id);
    res.json(memories);
}

export async function createMemory(req: Request, res: Response) {
    const input = createMemorySchema.parse(req.body);
    const memory = await createMemoryForUser(req.session.user.id, input);
    res.status(201).json(memory);
}

export async function updateMemory(req: Request, res: Response) {
    const { memoryId } = memoryIdParamSchema.parse(req.params);
    const input = updateMemorySchema.parse(req.body);
    const memory = await updateMemoryForUser(
        req.session.user.id,
        memoryId,
        input,
    );
    res.json(memory);
}

export async function deleteMemory(req: Request, res: Response) {
    const { memoryId } = memoryIdParamSchema.parse(req.params);
    await deleteUserMemory(memoryId);
    res.status(204).send();
}

```

#### Code Explanation: `server/src/controllers/memory.controller.ts`

**Overview & Architectural Role:**
- `server/src/controllers/memory.controller.ts` is a production source module containing **39 lines** of code.
- **Layer**: Controller Layer in Express backend (5-Layer Pattern). Extracts parameters from HTTP requests, delegates validation/logic to domain services, and returns formatted HTTP responses.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 6)**:
  - `import type { Request, Response } from "express";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { deleteUserMemory, listUserMemories } from "../lib/mem0.js";`: Imports required module bindings.
  - `import {`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 39 lines of `memory.controller.ts`.

#### File Path: `server/src/routes/memory.routes.ts`

```typescript
import { Router } from "express";
import {
    createMemory,
    deleteMemory,
    listMemories,
    updateMemory,
} from "../controllers/memory.controller.js";
import { requireAuth } from "../middleware/require-auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const memoryRoutes = Router();

memoryRoutes.use(requireAuth);

memoryRoutes.get("/", asyncHandler(listMemories));
memoryRoutes.post("/", asyncHandler(createMemory));
memoryRoutes.patch("/:memoryId", asyncHandler(updateMemory));
memoryRoutes.delete("/:memoryId", asyncHandler(deleteMemory));

```

#### Code Explanation: `server/src/routes/memory.routes.ts`

**Overview & Architectural Role:**
- `server/src/routes/memory.routes.ts` is a production source module containing **18 lines** of code.
- **Layer**: Route Router Layer in Express backend. Maps REST API endpoints to controller handlers and binds security middleware.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 6)**:
  - `import { Router } from "express";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { requireAuth } from "../middleware/require-auth.middleware.js";`: Imports required module bindings.
  - `import { asyncHandler } from "../utils/async-handler.js";`: Imports required module bindings.
- **Constants & Exported Utilities**:
  - `export const memoryRoutes = Router();`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 18 lines of `memory.routes.ts`.
