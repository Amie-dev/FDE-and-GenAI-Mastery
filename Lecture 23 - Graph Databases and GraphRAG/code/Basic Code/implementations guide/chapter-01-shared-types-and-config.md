# Chapter 01 — Shared Types & Config

**Notes source:** `notes/01_Graph_Database_Fundamentals.md`, `notes/04_Neo4j_NodeJS_Driver.md`

**Goal:** Define the shared data shapes and the single source of configuration. This is the base layer that everything else imports.

---

## 1. `src/types.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/types.ts` |
| Chapter | 01 (supports Chapters 02–07) |
| What it does | Declares TypeScript interfaces for messages, sessions, memories, search results, and GraphRAG answers. Every service/controller imports from here so all files agree on shapes. |

### Full code

```ts
/** Shared types for the Lecture 20 (Graph Databases and GraphRAG) basic code.
 * Kept in one file so every service and controller agrees on the shapes.
 */

export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string;
}

export interface Session {
  id: string;
  userId: string;
  messages: Message[];
  updatedAt: string;
}

export interface Memory {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  hitCount: number;
  version: number;
  confidence: number;
  source: string;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  stmMessages: number;
  ltmMemories: number;
}
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `export type Role = "user" \| "assistant" \| "system"` | Restricts message roles to valid chat roles. |
| `export interface Message` | One chat turn: who said it (`role`) and what they said (`content`). |
| `export interface Session` | One conversation session: id, userId, messages, updatedAt. |
| `export interface Memory` | One long-term fact with metadata: timestamps, hit count, confidence, version, source. |
| `export interface MemorySearchResult` | One retrieval result: a memory plus its score. |
| `export interface ChatResponse` | What an agent chat endpoint returns: reply + STM/LTM stats. |

---

## 2. `src/config/config.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/config/config.ts` |
| Chapter | 01 (supports Chapters 02–07) |
| What it does | Reads `.env` once and exports a frozen `config` object. No other file reads `process.env` directly. |

### Full code

```ts
import "dotenv/config";

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Single source of truth for environment configuration.
 * Every other file imports from here; nothing else reads process.env directly.
 */
export const config = {
  port: num(process.env.PORT, 3000),

  /** Neo4j connection (Chapter 03, 04). */
  neo4jUri: process.env.NEO4J_URI || "bolt://localhost:7687",
  neo4jUser: process.env.NEO4J_USER || "neo4j",
  neo4jPassword: process.env.NEO4J_PASSWORD || "password",
  neo4jDatabase: process.env.NEO4J_DATABASE || "neo4j",

  /** GraphRAG retrieval (Chapter 06). */
  vectorIndex: process.env.VECTOR_INDEX || "doc_emb_idx",
  vectorTopK: num(process.env.VECTOR_TOP_K, 5),

  /** Agent memory (Chapter 07). */
  stmWindowSize: num(process.env.STM_WINDOW_SIZE, 6),
  ltmTopK: num(process.env.LTM_TOP_K, 5),
  maxContextTokens: num(process.env.MAX_CONTEXT_TOKENS, 2000),
} as const;
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `import "dotenv/config"` | Loads variables from `.env`. |
| `function num(...)` | Parses a positive number from env, else fallback. |
| `port` | HTTP port (default 3000). |
| `neo4jUri`, `neo4jUser`, `neo4jPassword`, `neo4jDatabase` | Neo4j connection settings (Chapter 03/04). |
| `vectorIndex`, `vectorTopK` | GraphRAG retrieval settings (Chapter 06). |
| `stmWindowSize`, `ltmTopK`, `maxContextTokens` | Agent memory settings (Chapter 07). |
| `as const` | Makes the object readonly. |

### Command

```bash
npm run typecheck
```