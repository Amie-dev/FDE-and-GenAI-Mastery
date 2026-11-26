
# 🚀 Server Chapter 10 — Async Structured Learning Artifacts Engine

## 1. Goal & Outcome

### 🎯 Goal

Build an **asynchronous learning-artifact generation system** that converts processed workspace sources into structured study materials such as:

* 📝 Summaries
* 💡 Key Takeaways
* 🧠 Flashcards
* ❓ Quizzes
* 🌳 Mind Maps
* 📊 Reports

The system combines:

* **Express.js** for the HTTP API
* **Zod** for runtime input and output validation
* **Prisma** for artifact persistence
* **Inngest** for asynchronous background execution
* **AI SDK** for LLM generation
* **OpenAI** as the model provider
* **Structured outputs** for machine-readable artifact formats

### 🎓 Student Outcome

By the end of this chapter, you will understand how to build a production-style asynchronous AI generation workflow where:

```text
Client
   ↓
POST /artifacts
   ↓
Validate Request
   ↓
Verify Workspace
   ↓
Create PENDING Artifact
   ↓
Enqueue Inngest Event
   ↓
HTTP 201 Response
   ↓
Background Worker
   ↓
Gather Source Context
   ↓
Generate Structured Artifact
   ↓
Persist Result
   ↓
READY / FAILED
   ↓
Client Polls Artifact
```

This separates the **user-facing API request** from the potentially slow AI generation process.

---

# 2. Server Installation

From the server directory:

```bash
cd week05/chaibook-llm-sir/server

npm install zod openai inngest
```

> The source code also uses the Vercel AI SDK and `@ai-sdk/openai`. These packages must already exist in the project or be installed separately if they are not already present.

---

# 3. Architecture Overview

The artifact engine follows a layered architecture:

```text
┌──────────────────────────────┐
│          HTTP Client         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Artifact Routes        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      Artifact Controller     │
│                              │
│ - Parse params               │
│ - Validate body              │
│ - Return HTTP response       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Artifact Service       │
│                              │
│ - Authorization              │
│ - Create artifact            │
│ - Enqueue job                │
│ - Process artifact           │
└───────┬──────────────────────┘
        │
        ├─────────────────────────┐
        ▼                         ▼
┌───────────────┐       ┌──────────────────┐
│   Repository  │       │     Inngest      │
│   + Prisma    │       │ Background Job   │
└───────┬───────┘       └────────┬─────────┘
        │                        │
        ▼                        ▼
┌───────────────┐       ┌──────────────────┐
│   Database    │       │ Generation       │
│ Learning      │       │ Service          │
│ Artifact      │       └────────┬─────────┘
└───────────────┘                │
                                 ▼
                        ┌──────────────────┐
                        │ AI SDK + OpenAI  │
                        │ Structured Output │
                        └──────────────────┘
```

---

# 4. Artifact Validation

## File

`server/src/validators/artifact.validator.ts`

```typescript
import { z } from "zod";
import { workspaceIdParamSchema } from "./workspace.validator.js";

export const artifactTypes = [
    "SUMMARY",
    "TAKEAWAYS",
    "FLASHCARDS",
    "QUIZ",
    "MINDMAP",
    "REPORT",
] as const;

export const artifactIdParamSchema = workspaceIdParamSchema.extend({
    artifactId: z.string().trim().min(1, "Artifact id is required"),
});

export const createArtifactSchema = z.object({
    type: z.enum(artifactTypes),
    title: z.string().trim().min(1).max(120).optional(),
    sourceIds: z.array(z.string().trim().min(1)).optional(),
});

export type CreateArtifactInput = z.infer<typeof createArtifactSchema>;
```

## Architectural Role

This module belongs to the **validation layer**.

It provides two important capabilities:

1. **Runtime validation** using Zod.
2. **Compile-time TypeScript inference** using `z.infer`.

### `artifactTypes`

```typescript
export const artifactTypes = [
    "SUMMARY",
    "TAKEAWAYS",
    "FLASHCARDS",
    "QUIZ",
    "MINDMAP",
    "REPORT",
] as const;
```

The `as const` assertion preserves the literal values instead of widening them to `string[]`.

This allows:

```typescript
z.enum(artifactTypes)
```

to accept only supported artifact types.

---

### `artifactIdParamSchema`

```typescript
export const artifactIdParamSchema = workspaceIdParamSchema.extend({
    artifactId: z.string().trim().min(1, "Artifact id is required"),
});
```

Instead of duplicating workspace validation, the artifact schema extends the existing workspace parameter schema.

Conceptually:

```text
workspaceIdParamSchema
        +
artifactId
        ↓
artifactIdParamSchema
```

This allows routes such as:

```text
/api/workspaces/:workspaceId/artifacts/:artifactId
```

to validate both parameters.

---

### `createArtifactSchema`

```typescript
export const createArtifactSchema = z.object({
    type: z.enum(artifactTypes),
    title: z.string().trim().min(1).max(120).optional(),
    sourceIds: z.array(z.string().trim().min(1)).optional(),
});
```

The request can contain:

| Field       | Required | Purpose                                 |
| ----------- | -------- | --------------------------------------- |
| `type`      | Yes      | Artifact type                           |
| `title`     | No       | Custom artifact title                   |
| `sourceIds` | No       | Restrict generation to specific sources |

If `sourceIds` is omitted, the generation service can use all eligible sources.

---

### Type Inference

```typescript
export type CreateArtifactInput =
    z.infer<typeof createArtifactSchema>;
```

Zod becomes the single source of truth for the request shape.

Conceptually:

```text
HTTP JSON
   ↓
Zod Schema
   ↓
Validated Runtime Data
   ↓
CreateArtifactInput
   ↓
Service Layer
```

---

# 5. Artifact Event Helper

## File

`server/src/lib/artifact-events.ts`

```typescript
/**
 * Inngest event helpers for background artifact generation.
 */

import { inngest } from "../inngest/client.js";

/**
 * Enqueues an artifact generation job to run asynchronously via Inngest.
 *
 * @param input - Artifact and workspace ids for the worker
 * @returns Resolves when the event is accepted by Inngest
 */
export async function enqueueArtifactGeneration(input: {
    artifactId: string;
    workspaceId: string;
}) {
    await inngest.send({
        name: "artifact/generate",
        data: input,
    });
}
```

## Architectural Role

This module isolates Inngest event publishing from the rest of the application.

Instead of directly calling:

```typescript
inngest.send(...)
```

throughout the codebase, the service calls:

```typescript
enqueueArtifactGeneration(...)
```

This creates a clean abstraction:

```text
Artifact Service
       ↓
enqueueArtifactGeneration()
       ↓
Inngest
       ↓
artifact/generate
       ↓
Background Worker
```

### Important Behavior

This function enqueues the event; it does **not** wait for the AI generation to finish.

Therefore:

```typescript
await enqueueArtifactGeneration(...)
```

means the event submission completed successfully, not that the artifact is already `READY`.

---

# 6. Artifact Repository

## File

`server/src/repositories/artifact.repository.ts`

The repository encapsulates all Prisma operations related to `LearningArtifact`.

```typescript
import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/db.js";

export const artifactSelect = {
    id: true,
    workspaceId: true,
    type: true,
    title: true,
    content: true,
    sourceIds: true,
    status: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
} as const;

export type ArtifactRecord =
    Prisma.LearningArtifactGetPayload<{
        select: typeof artifactSelect;
    }>;

export type CreateArtifactData = {
    workspaceId: string;
    type: ArtifactRecord["type"];
    title: string;
    sourceIds: string[];
    status?: ArtifactRecord["status"];
    metadata?: Prisma.InputJsonValue;
};

export function findArtifactsByWorkspaceId(
    workspaceId: string,
) {
    return prisma.learningArtifact.findMany({
        where: { workspaceId },
        select: artifactSelect,
        orderBy: { createdAt: "desc" },
    });
}

export function findArtifactByIdAndWorkspaceId(
    artifactId: string,
    workspaceId: string,
) {
    return prisma.learningArtifact.findFirst({
        where: {
            id: artifactId,
            workspaceId,
        },
        select: artifactSelect,
    });
}

export function createArtifactRecord(
    data: CreateArtifactData,
) {
    return prisma.learningArtifact.create({
        data: {
            workspaceId: data.workspaceId,
            type: data.type,
            title: data.title,
            sourceIds: data.sourceIds,
            status: data.status ?? "PENDING",
            metadata: data.metadata,
        },
        select: artifactSelect,
    });
}

export function updateArtifactRecord(
    artifactId: string,
    data: {
        title?: string;
        content?: Prisma.InputJsonValue;
        status?: ArtifactRecord["status"];
        metadata?: Prisma.InputJsonValue;
    },
) {
    return prisma.learningArtifact.update({
        where: { id: artifactId },
        data,
        select: artifactSelect,
    });
}

export async function deleteArtifactRecord(
    artifactId: string,
) {
    await prisma.learningArtifact.delete({
        where: { id: artifactId },
    });
}

export function findArtifactById(
    artifactId: string,
) {
    return prisma.learningArtifact.findUnique({
        where: { id: artifactId },
        select: artifactSelect,
    });
}
```

## Architectural Role

The repository provides the database abstraction for the artifact domain.

The service layer does not need to know how Prisma queries are constructed.

```text
Service
   ↓
Repository
   ↓
Prisma
   ↓
Database
```

---

## `artifactSelect`

```typescript
export const artifactSelect = {
    id: true,
    workspaceId: true,
    type: true,
    title: true,
    content: true,
    sourceIds: true,
    status: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
} as const;
```

A shared selection object ensures that artifact queries return a consistent shape.

It also allows Prisma to infer the corresponding TypeScript type.

---

## `ArtifactRecord`

```typescript
export type ArtifactRecord =
    Prisma.LearningArtifactGetPayload<{
        select: typeof artifactSelect;
    }>;
```

This derives the TypeScript type directly from the Prisma selection.

That means if `artifactSelect` changes, the generated type changes with it.

---

## Workspace-Scoped Lookup

```typescript
findArtifactByIdAndWorkspaceId(
    artifactId,
    workspaceId
)
```

The query checks both:

```text
artifactId
+
workspaceId
```

This is important for multi-tenant applications because an artifact should not be returned merely because its ID exists.

---

# 7. Artifact Service

## File

`server/src/services/artifact.service.ts`

This is the main orchestration layer.

It handles:

* Workspace authorization
* Artifact creation
* Source-context preparation
* Inngest event dispatch
* Artifact retrieval
* Artifact deletion
* Background artifact processing
* Status transitions
* Error persistence

---

## Listing Artifacts

```typescript
export async function listArtifactsForWorkspace(
    workspaceId: string,
    userId: string,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);

    return findArtifactsByWorkspaceId(workspaceId);
}
```

The authorization check happens before database retrieval:

```text
User
 ↓
workspaceId + userId
 ↓
Verify workspace access
 ↓
Query artifacts
```

This prevents an authenticated user from simply supplying another workspace ID.

---

# 8. Getting an Artifact

```typescript
export async function getArtifactForWorkspace(
    workspaceId: string,
    artifactId: string,
    userId: string,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);

    const artifact =
        await findArtifactByIdAndWorkspaceId(
            artifactId,
            workspaceId,
        );

    if (!artifact) {
        throw new NotFoundError("Artifact not found");
    }

    return artifact;
}
```

Two checks are performed:

### 1. Workspace authorization

```typescript
getWorkspaceByIdForUser(...)
```

### 2. Workspace-scoped artifact lookup

```typescript
findArtifactByIdAndWorkspaceId(...)
```

This creates defense in depth around tenant isolation.

---

# 9. Creating an Artifact

The creation workflow is:

```text
POST /artifacts
      ↓
Validate request
      ↓
Verify workspace access
      ↓
Gather READY source context
      ↓
Create PENDING artifact
      ↓
Send Inngest event
      ↓
Return artifact
```

Core implementation:

```typescript
export async function createArtifactForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateArtifactInput,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);

    const context = await gatherSourceContext(
        workspaceId,
        input.sourceIds,
    );

    const artifact = await createArtifactRecord({
        workspaceId,
        type: input.type,
        title:
            input.title ||
            `${
                {
                    SUMMARY: "Summary",
                    TAKEAWAYS: "Key Takeaways",
                    FLASHCARDS: "Flashcards",
                    QUIZ: "Quiz",
                    MINDMAP: "Mind Map",
                    REPORT: "AI Report",
                }[input.type]
            } · ${new Date().toLocaleDateString()}`,
        sourceIds: context.sourceIds,
        status: "PENDING",
    });

    await enqueueArtifactGeneration({
        artifactId: artifact.id,
        workspaceId,
    });

    return artifact;
}
```

### Why create the database row first?

The database row provides a durable representation of the job:

```text
PENDING
   ↓
PROCESSING
   ↓
READY
```

or:

```text
PENDING
   ↓
PROCESSING
   ↓
FAILED
```

The client can therefore immediately receive an artifact ID and poll its status.

---

# 10. Deleting an Artifact

```typescript
export async function deleteArtifactForWorkspace(
    workspaceId: string,
    artifactId: string,
    userId: string,
) {
    await getArtifactForWorkspace(
        workspaceId,
        artifactId,
        userId,
    );

    await deleteArtifactRecord(artifactId);
}
```

The service first verifies ownership and existence before deletion.

---

# 11. Background Artifact Processing

The main worker-facing function is:

```typescript
processArtifactById(artifactId)
```

Its lifecycle is:

```text
PENDING
   ↓
PROCESSING
   ↓
Gather Source Context
   ↓
Generate Artifact
   ↓
READY
```

On failure:

```text
PROCESSING
   ↓
FAILED
```

Implementation:

```typescript
export async function processArtifactById(
    artifactId: string,
) {
    const artifact = await findArtifactById(artifactId);

    if (!artifact) {
        throw new Error("Artifact not found");
    }

    await updateArtifactRecord(
        artifactId,
        { status: "PROCESSING" },
    );

    try {
        const context = await gatherSourceContext(
            artifact.workspaceId,
            artifact.sourceIds,
        );

        const content = await generateArtifactContent(
            artifact.type,
            context.text,
        );

        return updateArtifactRecord(
            artifactId,
            {
                status: "READY",
                content: content as Prisma.InputJsonValue,
                metadata: {
                    generatedAt:
                        new Date().toISOString(),
                    processingError: undefined,
                },
            },
        );
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Artifact generation failed";

        await updateArtifactRecord(
            artifactId,
            {
                status: "FAILED",
                metadata: {
                    processingError: message,
                },
            },
        );

        throw error;
    }
}
```

### Important Inngest Behavior

The worker rethrows the error:

```typescript
throw error;
```

This is important because the background-job system needs to know that processing failed so its retry mechanism can operate.

Therefore:

```text
Generation Error
      ↓
Persist FAILED
      ↓
Rethrow Error
      ↓
Inngest sees failure
      ↓
Retry according to configuration
```

---

# 12. Source Context Gathering

## File

`server/src/services/artifact-generation.service.ts`

The artifact generator first collects source material.

```typescript
const MAX_CONTEXT_CHARS = 120_000;
```

This places a maximum size on the source context passed to the model.

---

## `gatherSourceContext`

```typescript
export async function gatherSourceContext(
    workspaceId: string,
    sourceIds?: string[],
) {
    const sources = await findSourcesByWorkspaceId(
        workspaceId,
        {
            status: "READY",
        },
    );

    const selected = sourceIds?.length
        ? sources.filter((source) =>
              sourceIds.includes(source.id),
          )
        : sources;

    if (selected.length === 0) {
        throw new ValidationError(
            "No ready sources found. Add and process sources before generating learning tools.",
        );
    }

    const withContent = selected.flatMap((source) => {
        const content = source.content?.trim();

        return content
            ? [
                  {
                      title: source.title,
                      content,
                  },
              ]
            : [];
    });

    if (withContent.length === 0) {
        throw new ValidationError(
            "Selected sources have no extracted content yet.",
        );
    }

    const text = withContent
        .map(
            (source) =>
                `# ${source.title}\n\n${source.content}`,
        )
        .join("\n\n---\n\n")
        .slice(0, MAX_CONTEXT_CHARS);

    return {
        text,
        sourceIds: selected.map(
            (source) => source.id,
        ),
    };
}
```

---

## Source Selection

Only sources with:

```typescript
status: "READY"
```

are considered.

Then the service optionally filters them using:

```typescript
sourceIds
```

So the behavior is:

```text
sourceIds provided?
      │
      ├── YES → Use selected READY sources
      │
      └── NO  → Use all READY sources
```

---

## Context Formatting

Each source becomes:

```text
# Source Title

Source content
```

Multiple sources are separated by:

```text
---
```

Result:

```text
# React Native

React Native content...

---

# Node.js

Node.js content...

---

# RAG

RAG content...
```

This gives the model explicit boundaries between source documents.

---

# 13. Structured Artifact Schemas

The service defines Zod schemas for structured artifacts.

These schemas act as the expected output contract between the application and the model.

---

## Flashcards

```typescript
const flashcardsSchema = z.object({
    cards: z
        .array(
            z.object({
                front: z.string(),
                back: z.string(),
            }),
        )
        .min(3)
        .max(30),
});
```

Expected structure:

```json
{
  "cards": [
    {
      "front": "What is RAG?",
      "back": "Retrieval-Augmented Generation..."
    }
  ]
}
```

The schema requires between **3 and 30 cards**.

---

# 14. Quiz Schema

```typescript
const quizSchema = z.object({
    questions: z
        .array(
            z.object({
                question: z.string(),
                options: z
                    .array(z.string())
                    .min(2)
                    .max(5),
                correctIndex: z
                    .number()
                    .int()
                    .min(0),
                explanation: z.string(),
            }),
        )
        .min(3)
        .max(15),
});
```

Each question contains:

```text
question
options
correctIndex
explanation
```

Example conceptual structure:

```json
{
  "question": "What does RAG stand for?",
  "options": [
    "Retrieval-Augmented Generation",
    "Random AI Generation",
    "Recursive Agent Graph"
  ],
  "correctIndex": 0,
  "explanation": "RAG combines retrieval with generation."
}
```

### Important Validation Detail

The schema ensures:

```typescript
correctIndex >= 0
```

but it does **not** currently guarantee:

```text
correctIndex < options.length
```

That relationship would require an additional refinement if strict validation of the index is desired.

---

# 15. Mind Map Schema

```typescript
const mindmapSchema = z.object({
    nodes: z
        .array(
            z.object({
                id: z.string(),
                label: z.string(),
            }),
        )
        .min(2)
        .max(40),

    edges: z.array(
        z.object({
            id: z.string(),
            source: z.string(),
            target: z.string(),
        }),
    ),
});
```

The result represents a graph:

```text
              ┌─────────────┐
              │ Central Node │
              └──────┬──────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Node A      Node B      Node C
```

`nodes` represent concepts.

`edges` represent relationships between concepts.

The current schema does not verify that an edge's `source` and `target` actually exist in the `nodes` array.

---

# 16. Takeaways Schema

```typescript
const takeawaysSchema = z.object({
    items: z
        .array(z.string())
        .min(3)
        .max(20),
});
```

The model must return between **3 and 20 takeaway items**.

Example:

```json
{
  "items": [
    "RAG retrieves external context before generation.",
    "Embeddings represent semantic meaning.",
    "Vector databases support similarity search."
  ]
}
```

---

# 17. Report Schema

```typescript
const reportSchema = z.object({
    markdown: z.string(),

    sections: z.array(
        z.object({
            title: z.string(),
            content: z.string(),
        }),
    ),
});
```

The report therefore has two representations:

```text
markdown
   +
sections[]
```

This allows the application to display the report as either:

* rendered Markdown
* structured sections

---

# 18. Artifact Generation Service

The AI generation service uses:

```typescript
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
```

The model is loaded from:

```typescript
CHAT_MODEL
```

rather than being hardcoded inside every generation function.

---

# 19. Common System Prompt

```typescript
const system = [
    `You are Chaibook, an expert learning assistant generating a ${type.toLowerCase()} from workspace source materials.`,
    "Use ONLY the provided source content. Do not invent facts not supported by the sources.",
    "Be clear, educational, and well-structured.",
].join("\n");
```

The key instruction is:

```text
Use ONLY the provided source content.
```

This is important for educational artifacts because the generated material should be grounded in the user's uploaded learning material.

---

# 20. Summary Generation

Summary generation returns Markdown:

```typescript
case "SUMMARY": {
    const result = await generateText({
        model: openai(CHAT_MODEL),
        system,
        prompt:
            `Write a comprehensive markdown summary of the following sources:\n\n${sourceText}`,
    });

    return {
        markdown: result.text,
    };
}
```

Unlike the other structured artifacts, the summary currently returns plain model text wrapped in:

```json
{
  "markdown": "..."
}
```

---

# 21. Structured Takeaways

```typescript
case "TAKEAWAYS": {
    const result = await generateText({
        model: openai(CHAT_MODEL),
        system,
        output: Output.object({
            schema: takeawaysSchema,
        }),
        prompt:
            `Extract the most important key takeaways as concise bullet points from:\n\n${sourceText}`,
    });

    return result.output;
}
```

The `Output.object(...)` configuration tells the AI SDK to generate an object matching the supplied schema.

Conceptually:

```text
Source Context
      ↓
LLM
      ↓
Structured Object
      ↓
Zod Schema
      ↓
Application JSON
```

---

# 22. Flashcard Generation

```typescript
case "FLASHCARDS": {
    const result = await generateText({
        model: openai(CHAT_MODEL),
        system,
        output: Output.object({
            schema: flashcardsSchema,
        }),
        prompt:
            `Create study flashcards (front/back) covering the main concepts from:\n\n${sourceText}`,
    });

    return result.output;
}
```

The model must produce:

```text
cards[]
   ├── front
   └── back
```

This makes the result directly consumable by a frontend flashcard component.

---

# 23. Quiz Generation

```typescript
case "QUIZ": {
    const result = await generateText({
        model: openai(CHAT_MODEL),
        system,
        output: Output.object({
            schema: quizSchema,
        }),
        prompt:
            `Create a multiple-choice quiz with explanations from:\n\n${sourceText}`,
    });

    return result.output;
}
```

The structured output can directly power:

```text
Quiz UI
   ↓
Question
   ↓
Options
   ↓
Answer Selection
   ↓
Correct Answer
   ↓
Explanation
```

---

# 24. Mind Map Generation

```typescript
case "MINDMAP": {
    const result = await generateText({
        model: openai(CHAT_MODEL),
        system,
        output: Output.object({
            schema: mindmapSchema,
        }),
        prompt:
            `Create a mind map as nodes and edges. Use a central topic node and branch out logically from:\n\n${sourceText}`,
    });

    return result.output;
}
```

The frontend can transform this JSON into a graphical mind map.

---

# 25. Report Generation

```typescript
case "REPORT": {
    const result = await generateText({
        model: openai(CHAT_MODEL),
        system,
        output: Output.object({
            schema: reportSchema,
        }),
        prompt:
            `Write a structured long-form report with sections and a full markdown version from:\n\n${sourceText}`,
    });

    return result.output;
}
```

The report contains:

```text
markdown
   +
sections[]
```

This supports both rich rendering and structured UI presentation.

---

# 26. Unsupported Artifact Types

The switch contains a default guard:

```typescript
default:
    throw new ValidationError(
        `Unsupported artifact type: ${type}`,
    );
```

This protects the generation layer if an unsupported value reaches the service despite the normal request validation.

This is useful as **defense in depth**.

---

# 27. Artifact Controller

## File

`server/src/controllers/artifact.controller.ts`

The controller is responsible for translating HTTP requests into service calls.

```typescript
import type { Request, Response } from "express";

import {
    createArtifactForWorkspace,
    deleteArtifactForWorkspace,
    getArtifactForWorkspace,
    listArtifactsForWorkspace,
} from "../services/artifact.service.js";

import {
    artifactIdParamSchema,
    createArtifactSchema,
} from "../validators/artifact.validator.js";

import {
    workspaceIdParamSchema,
} from "../validators/workspace.validator.js";
```

---

## List

```typescript
export async function listArtifacts(
    req: Request,
    res: Response,
) {
    const { workspaceId } =
        workspaceIdParamSchema.parse(req.params);

    const artifacts =
        await listArtifactsForWorkspace(
            workspaceId,
            req.session.user.id,
        );

    res.json(artifacts);
}
```

---

## Get One

```typescript
export async function getArtifact(
    req: Request,
    res: Response,
) {
    const { workspaceId, artifactId } =
        artifactIdParamSchema.parse(req.params);

    const artifact =
        await getArtifactForWorkspace(
            workspaceId,
            artifactId,
            req.session.user.id,
        );

    res.json(artifact);
}
```

---

## Create

```typescript
export async function createArtifact(
    req: Request,
    res: Response,
) {
    const { workspaceId } =
        workspaceIdParamSchema.parse(req.params);

    const input =
        createArtifactSchema.parse(req.body);

    const artifact =
        await createArtifactForWorkspace(
            workspaceId,
            req.session.user.id,
            input,
        );

    res.status(201).json(artifact);
}
```

The controller does not generate the artifact itself.

It only:

```text
Parse
 ↓
Validate
 ↓
Delegate
 ↓
Respond
```

---

## Delete

```typescript
export async function deleteArtifact(
    req: Request,
    res: Response,
) {
    const { workspaceId, artifactId } =
        artifactIdParamSchema.parse(req.params);

    await deleteArtifactForWorkspace(
        workspaceId,
        artifactId,
        req.session.user.id,
    );

    res.status(204).send();
}
```

A successful DELETE returns:

```http
204 No Content
```

---

# 28. Artifact Routes

## File

`server/src/routes/artifact.routes.ts`

```typescript
import { Router } from "express";

import {
    createArtifact,
    deleteArtifact,
    getArtifact,
    listArtifacts,
} from "../controllers/artifact.controller.js";

import { asyncHandler } from "../utils/async-handler.js";

export const artifactRoutes =
    Router({ mergeParams: true });

artifactRoutes.get(
    "/",
    asyncHandler(listArtifacts),
);

artifactRoutes.post(
    "/",
    asyncHandler(createArtifact),
);

artifactRoutes.get(
    "/:artifactId",
    asyncHandler(getArtifact),
);

artifactRoutes.delete(
    "/:artifactId",
    asyncHandler(deleteArtifact),
);
```

The router exposes four endpoints:

| Method   | Endpoint       | Purpose         |
| -------- | -------------- | --------------- |
| `GET`    | `/`            | List artifacts  |
| `POST`   | `/`            | Create artifact |
| `GET`    | `/:artifactId` | Get artifact    |
| `DELETE` | `/:artifactId` | Delete artifact |

`mergeParams: true` allows the nested router to access the parent route's `workspaceId`.

---

# 29. Route Registration

## File

`server/src/routes/index.ts`

```typescript
import type { Express } from "express";

import { artifactRoutes } from "./artifact.routes.js";
import {
    chatRoutes,
    conversationRoutes,
} from "./chat.routes.js";

import { memoryRoutes } from "./memory.routes.js";
import { sourceRoutes } from "./source.routes.js";
import { workspaceRoutes } from "./workspace.routes.js";

export function registerRoutes(
    app: Express,
): void {
    workspaceRoutes.use(
        "/:workspaceId/sources",
        sourceRoutes,
    );

    workspaceRoutes.use(
        "/:workspaceId/conversations",
        conversationRoutes,
    );

    workspaceRoutes.use(
        "/:workspaceId/chat",
        chatRoutes,
    );

    workspaceRoutes.use(
        "/:workspaceId/artifacts",
        artifactRoutes,
    );

    app.use(
        "/api/workspaces",
        workspaceRoutes,
    );

    app.use(
        "/api/memory",
        memoryRoutes,
    );
}
```

The artifact API therefore becomes:

```text
/api/workspaces/:workspaceId/artifacts
```

with nested routes:

```text
GET    /api/workspaces/:workspaceId/artifacts
POST   /api/workspaces/:workspaceId/artifacts
GET    /api/workspaces/:workspaceId/artifacts/:artifactId
DELETE /api/workspaces/:workspaceId/artifacts/:artifactId
```

---

# 30. Complete Async Generation Flow

The complete system can be visualized as:

```text
                    ┌───────────────┐
                    │     Client    │
                    └───────┬───────┘
                            │
                            │ POST /artifacts
                            ▼
                 ┌──────────────────────┐
                 │ Artifact Controller  │
                 └──────────┬───────────┘
                            │
                     Zod Validation
                            │
                            ▼
                 ┌──────────────────────┐
                 │   Artifact Service   │
                 └──────────┬───────────┘
                            │
                  Verify Workspace
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Gather READY Sources │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Create PENDING Row   │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │  Send Inngest Event  │
                 │  artifact/generate   │
                 └──────────┬───────────┘
                            │
                            ▼
                     HTTP 201 Response
                            │
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             │
      Client Polls                        │
             │                             │
             │                             ▼
             │                  ┌────────────────────┐
             │                  │ Inngest Background │
             │                  │       Worker       │
             │                  └─────────┬──────────┘
             │                            │
             │                            ▼
             │                  status = PROCESSING
             │                            │
             │                            ▼
             │                  Gather Source Context
             │                            │
             │                            ▼
             │                  Generate AI Artifact
             │                            │
             │                            ▼
             │                  Persist JSON Content
             │                            │
             │                            ▼
             │                      status = READY
             │
             ▼
      GET /artifacts/:id
             │
             ▼
       Return artifact
```

---

# 31. Artifact State Machine

The artifact lifecycle is essentially:

```text
                ┌───────────┐
                │  PENDING  │
                └─────┬─────┘
                      │
                      ▼
                ┌───────────┐
                │PROCESSING │
                └─────┬─────┘
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
       ┌───────────┐      ┌───────────┐
       │   READY   │      │   FAILED  │
       └───────────┘      └───────────┘
```

### PENDING

The database record exists, but generation has not completed.

### PROCESSING

The background worker is actively generating the artifact.

### READY

The artifact has successfully generated content.

### FAILED

Generation encountered an error.

---

# 32. Why Asynchronous Generation?

AI generation can take significantly longer than ordinary CRUD operations.

A synchronous implementation would look like:

```text
POST /artifacts
      ↓
Generate AI
      ↓
Wait
      ↓
Save result
      ↓
Response
```

This keeps the HTTP request open while the model works.

The asynchronous architecture instead uses:

```text
POST /artifacts
      ↓
Create PENDING
      ↓
Queue job
      ↓
Return immediately
```

Then:

```text
Background Worker
      ↓
Generate
      ↓
Persist
```

This is much better suited to long-running AI workloads.

---

# 33. Why Structured Outputs?

For artifacts such as quizzes and flashcards, returning arbitrary text creates additional parsing work.

Without structured output:

```text
LLM
 ↓
Raw text
 ↓
Custom parser
 ↓
Potential parsing errors
 ↓
Application object
```

With structured output:

```text
LLM
 ↓
Schema-constrained object
 ↓
Validated result
 ↓
Database
```

This makes AI output much easier for application code to consume.

---

# 34. Artifact Type → Output Format

| Artifact     | Output                           |
| ------------ | -------------------------------- |
| `SUMMARY`    | Markdown                         |
| `TAKEAWAYS`  | `{ items: string[] }`            |
| `FLASHCARDS` | `{ cards: [...] }`               |
| `QUIZ`       | `{ questions: [...] }`           |
| `MINDMAP`    | `{ nodes: [...], edges: [...] }` |
| `REPORT`     | `{ markdown, sections }`         |

This is a key architectural principle:

> **Different AI tasks can share the same generation infrastructure while enforcing different output contracts.**

---

# 35. End-to-End Request Example

Suppose the client sends:

```http
POST /api/workspaces/workspace_123/artifacts
Content-Type: application/json
```

```json
{
  "type": "FLASHCARDS",
  "title": "React Native Revision",
  "sourceIds": [
    "source_1",
    "source_2"
  ]
}
```

The API validates:

```text
type → FLASHCARDS ✓
title → valid string ✓
sourceIds → valid string[] ✓
```

Then:

```text
Workspace authorization
        ↓
Find READY sources
        ↓
Create artifact
        ↓
status = PENDING
        ↓
Send artifact/generate
        ↓
Return 201
```

Example initial response:

```json
{
  "id": "artifact_123",
  "workspaceId": "workspace_123",
  "type": "FLASHCARDS",
  "title": "React Native Revision",
  "status": "PENDING",
  "content": null
}
```

Later, the background worker changes it to:

```json
{
  "id": "artifact_123",
  "workspaceId": "workspace_123",
  "type": "FLASHCARDS",
  "title": "React Native Revision",
  "status": "READY",
  "content": {
    "cards": [
      {
        "front": "What is React Native?",
        "back": "A framework for building native mobile applications using React."
      }
    ]
  }
}
```

The frontend can simply poll:

```text
GET /api/workspaces/workspace_123/artifacts/artifact_123
```

until:

```text
status === "READY"
```

or:

```text
status === "FAILED"
```

---

# 36. Production Considerations

The current implementation provides a strong foundation, but several production concerns are worth understanding.

## 36.1 Event and Database Consistency

The sequence is:

```text
Create DB Row
      ↓
Send Inngest Event
```

If database creation succeeds but event publishing fails, the artifact may remain:

```text
PENDING
```

without a worker processing it.

A production system can address this with patterns such as:

* transactional outbox
* retryable event publishing
* reconciliation jobs
* explicit enqueue status

---

## 36.2 Worker Idempotency

Background jobs can be retried.

Therefore the worker should tolerate repeated execution.

For example:

```text
Job #1 → PROCESSING → READY

Retry
   ↓
Job #2
```

The implementation should avoid producing inconsistent state or unnecessary duplicate work.

---

## 36.3 Error Metadata

The current implementation stores:

```typescript
processingError: message
```

This is useful for debugging and displaying failure state.

However, production systems should avoid exposing sensitive internal errors directly to end users.

A better design can separate:

```text
internalError
userMessage
```

---

## 36.4 Context Size

The current implementation uses:

```typescript
const MAX_CONTEXT_CHARS = 120_000;
```

This is a character-based limit, not a token-based limit.

Character count does not map exactly to model tokens.

For production systems, token-aware context budgeting can provide more predictable model usage.

---

## 36.5 Source Filtering

The source IDs are filtered against the workspace's READY sources:

```typescript
sources.filter(
    (source) => sourceIds.includes(source.id),
)
```

This is important because the system should never load arbitrary source IDs from another workspace.

The filtering occurs against the already workspace-scoped source query.

---

## 36.6 Schema Relationships

Some constraints are local-field constraints.

For example:

```typescript
correctIndex: z.number().int().min(0)
```

does not guarantee that the index is smaller than:

```typescript
options.length
```

Likewise, the mind-map schema does not currently verify that:

```text
edge.source
edge.target
```

refer to existing node IDs.

These are examples of **cross-field validation** that can be added later with Zod refinements.

---

# 37. Key Architectural Concepts

This chapter demonstrates several important backend patterns.

### 1. Layered Architecture

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Repositories
  ↓
Database
```

### 2. Asynchronous Processing

```text
HTTP Request
   ↓
Queue Event
   ↓
Background Worker
```

### 3. State-Based Job Tracking

```text
PENDING → PROCESSING → READY
                    ↘ FAILED
```

### 4. Structured AI Generation

```text
Prompt
  ↓
LLM
  ↓
Schema-Constrained Output
  ↓
Application JSON
```

### 5. Multi-Tenant Authorization

```text
User
 ↓
Workspace Access
 ↓
Workspace Sources
 ↓
Artifact
```

---

# 38. Final Architecture

The complete Chapter 10 architecture is:

```text
                         ┌─────────────────┐
                         │      Client     │
                         └────────┬────────┘
                                  │
                                  ▼
                     ┌───────────────────────┐
                     │   Express REST API    │
                     └───────────┬───────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │       Zod            │
                     │ Request Validation   │
                     └───────────┬───────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │   Artifact Service   │
                     └───────┬───────┬───────┘
                             │       │
                   ┌─────────┘       └─────────┐
                   ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐
          │ Prisma / DB     │         │    Inngest      │
          │ Artifact State  │         │ Background Job  │
          └─────────────────┘         └────────┬────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │ Source Context      │
                                    │ Gathering           │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │ AI Generation       │
                                    │ Service             │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────┴──────────┐
                                    ▼                     ▼
                             ┌──────────────┐      ┌──────────────┐
                             │ AI SDK       │      │ Zod Schemas  │
                             │ + OpenAI     │      │ Structured   │
                             │              │      │ Output       │
                             └──────┬───────┘      └──────┬───────┘
                                    └──────────┬───────────┘
                                               ▼
                                    ┌─────────────────────┐
                                    │ Learning Artifact   │
                                    │ JSON / Markdown     │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │ Database            │
                                    │ status = READY      │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │ Client Polls        │
                                    │ Artifact Endpoint   │
                                    └─────────────────────┘
```

---

# 🎯 Chapter 10 Summary

The **Async Structured Learning Artifacts Engine** transforms processed learning sources into reusable AI-generated study materials.

The core pipeline is:

```text
User Request
     ↓
Zod Validation
     ↓
Workspace Authorization
     ↓
Gather READY Sources
     ↓
Create PENDING Artifact
     ↓
Enqueue Inngest Job
     ↓
Background Processing
     ↓
Generate Structured AI Output
     ↓
Persist Artifact
     ↓
READY / FAILED
     ↓
Client Polls Result
```

The most important idea is the separation between:

```text
API Request
```

and:

```text
AI Generation
```

The API creates a durable job representation and returns quickly, while **Inngest performs the expensive AI work asynchronously**.

At the same time, Zod provides structured contracts for AI-generated objects such as flashcards, quizzes, takeaways, mind maps, and reports, allowing the frontend to consume AI results as predictable application data rather than arbitrary text.

