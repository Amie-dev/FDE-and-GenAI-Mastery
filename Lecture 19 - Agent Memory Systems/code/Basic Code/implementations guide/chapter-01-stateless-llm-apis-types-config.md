# Chapter 01 — Stateless LLM APIs: Types & Config

**Notes source:** `Lecture 19 - Agent Memory Systems/notes/01_Stateless_LLM_APIs_and_Context_Window_Limitations.md`

**Goal:** Define the shared data shapes and the single source of configuration. This is Chapter 01 because nothing else can run until the types and config exist. It also captures the Chapter 1 idea: LLM APIs are stateless, so the application must hold conversation state itself.

---

## 1. `src/types.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/types.ts` |
| Chapter | 01 |
| What it does | Declares TypeScript interfaces for messages, sessions, memories, search results, and chat responses. Every service imports from here so all files agree on shapes. |

### Full code

```ts
/** Shared types for the Lecture 19 (Agent Memory Systems) basic code.
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
| `export type Role = "user" \| "assistant" \| "system"` | Restricts message roles to the three valid chat roles. Prevents typos from compiling. |
| `export interface Message` | One chat turn: who said it (`role`) and what they said (`content`). |
| `export interface Session` | One conversation session: id, which user it belongs to, the message list, and when it was last updated. |
| `export interface Memory` | One long-term fact with metadata: timestamps, hit count, confidence, version, source. Matches Chapter 3's memory metadata. |
| `export interface MemorySearchResult` | One retrieval result: a memory plus its similarity score. Returned by `searchMemories()`. |
| `export interface ChatResponse` | What `/api/chat` returns: reply plus small stats so learners can see STM/LTM usage. |

---

## 2. `src/config/config.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/config/config.ts` |
| Chapter | 01 (supports Chapters 2, 3, 4, 5) |
| What it does | Reads `.env` once and exports a frozen `config` object. No other file calls `process.env` directly — this is the single configuration seam. |

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

  /** STM: how many recent turns the sliding window keeps (Chapter 2). */
  stmWindowSize: num(process.env.STM_WINDOW_SIZE, 6),

  /** LTM: how many memories to retrieve per query (Chapter 4). */
  ltmTopK: num(process.env.LTM_TOP_K, 5),

  /** Context budget: max rough tokens sent to the LLM per request (Chapter 4). */
  maxContextTokens: num(process.env.MAX_CONTEXT_TOKENS, 2000),

  /** Fact extraction: only store facts at or above this confidence (Chapter 3). */
  factConfidenceThreshold: Number(process.env.FACT_CONFIDENCE_THRESHOLD ?? "0.7"),

  /** Eviction: memories below this score are candidates for removal (Chapter 5). */
  evictionScoreThreshold: num(process.env.EVICTION_SCORE_THRESHOLD, 5),
} as const;
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `import "dotenv/config"` | Loads variables from `.env` into `process.env` so the rest of the file can read them. |
| `function num(...)` | Reads a number from the environment. If the value is missing, not a number, or <= 0, returns the fallback instead of crashing. |
| `port` | HTTP port the server listens on (default 3000). |
| `stmWindowSize` | **Chapter 2.** How many recent turns the sliding window keeps (default 6). |
| `ltmTopK` | **Chapter 4.** How many relevant memories to fetch per query (default 5). |
| `maxContextTokens` | **Chapter 4.** Token budget for the assembled prompt (default 2000). |
| `factConfidenceThreshold` | **Chapter 3.** Minimum confidence for a fact to be stored (default 0.7). |
| `evictionScoreThreshold` | **Chapter 5.** Memories below this score are eviction candidates (default 5). |
| `as const` | Makes the object readonly so nothing can accidentally overwrite config at runtime. |

### Command

```bash
# After editing .env, confirm it still compiles
npm run typecheck
```
