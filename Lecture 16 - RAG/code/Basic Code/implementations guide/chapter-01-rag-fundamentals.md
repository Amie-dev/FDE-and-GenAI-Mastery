# Chapter 01 — RAG Fundamentals: Types & Config

**Notes source:** `Lecture 16 - RAG/notes/01_rag_fundamentals_stateless_model.md`

**Goal:** Define the shared data shapes and the single source of configuration. This is Chapter 01 because nothing else can run until the types and config exist.

---

## 1. `src/types.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/types.ts` |
| Chapter | 01 |
| What it does | Declares TypeScript interfaces for messages, sessions, chunks, vector records, matches, and query context. Every service imports from here so all files agree on shapes. |

### Full code

```ts
/** Shared types for the Lecture 16 (RAG) basic code.
 * Kept in one file so every service and controller agrees on the shapes.
 */

export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string;
}

export interface Session {
  id: string;
  tenantId: string;
  messages: Message[];
  updatedAt: string;
}

/** One retrieval-ready piece of a document, exactly as Chapter 03 describes. */
export interface Chunk {
  text: string;
  metadata: {
    source: string;
    docId: string;
    chunk: number;
    page?: number;
    section?: string;
  };
}

/** What the in-memory vector index stores: id + vector + flat metadata. */
export interface VectorRecord {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export interface IngestResult {
  file: string;
  chunks: number;
  embedded: number;
}

export interface Match {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface QueryContext {
  tenantId: string;
  roles: string[];
  sessionId: string;
}
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `export type Role = "user" \| "assistant" \| "system"` | Restricts message roles to the three valid chat roles. Prevents typos like `"systemm"` from compiling. |
| `export interface Message` | One chat turn: who said it (`role`) and what they said (`content`). Used by the memory service to store history. |
| `export interface Session` | One conversation session: id, which tenant it belongs to, the message list, and when it was last updated. Tenant isolation starts here. |
| `export interface Chunk` | One piece of a document after chunking (Chapter 03). Holds the text plus flat metadata (`source`, `docId`, `chunk`, `page`, `section`) for citation and filtering. |
| `export interface VectorRecord` | What the vector index stores: a stable `id`, the embedding `vector`, and flat `metadata`. Matches Chapter 05's record model (`id + values + metadata`). |
| `export interface IngestResult` | Return value of ingestion: which file, how many chunks, how many vectors embedded. |
| `export interface Match` | One retrieval result: id, similarity score, and metadata. Returned by `retrieve()`. |
| `export interface QueryContext` | Everything a query needs: `tenantId` (for isolation), `roles` (for ACL filtering), `sessionId` (for memory). Passed through every online call. |

---

## 2. `src/config/config.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/config/config.ts` |
| Chapter | 01 (supports Chapter 04: one model, one dimension) |
| What it does | Reads `.env` once and exports a frozen `config` object. No other file calls `process.env` directly — this is the single configuration seam. |

### Full code

```ts
import "dotenv/config";

/** Read a positive number from the environment, falling back when missing or silly. */
function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: num(process.env.PORT, 3000),

  openaiApiKey: process.env.OPENAI_API_KEY ?? "",

  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  embeddingDims: num(process.env.EMBEDDING_DIMS, 1024),

  chatModel: process.env.CHAT_MODEL ?? "gpt-4o-mini",

  chunkSize: num(process.env.CHUNK_SIZE, 400),
  chunkOverlap: num(process.env.CHUNK_OVERLAP, 80),

  topK: num(process.env.TOP_K, 4),

  namespace: process.env.NAMESPACE ?? "policies",
} as const;
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `import "dotenv/config"` | Loads variables from `.env` into `process.env` so the rest of the file can read them. |
| `function num(...)` | Reads a number from the environment. If the value is missing, not a number, or <= 0, returns the fallback instead of crashing. Keeps the app robust against bad `.env` values. |
| `port` | HTTP port the server listens on (default 3000). |
| `openaiApiKey` | OpenAI API key. Empty string if not set — the code falls back to a deterministic mock vector so it still runs without a key. |
| `embeddingModel` / `embeddingDims` | **Chapter 04 contract.** One model and one dimension used identically at ingestion and query time. Default `text-embedding-3-small` at 1024 dims. |
| `chatModel` | The LLM used for grounded generation (Chapter 06). Default `gpt-4o-mini`. |
| `chunkSize` / `chunkOverlap` | **Chapter 03.** Size of each text chunk and how much consecutive chunks overlap (default 400 chars / 80 chars overlap). |
| `topK` | **Chapter 05.** How many chunks to return per query (default 4). Small keeps the prompt cheap. |
| `namespace` | **Chapter 05.** Vector index namespace for isolation. Default `policies`. |
| `as const` | Makes the object readonly so nothing can accidentally overwrite config at runtime. |

### Command

```bash
# After editing .env, type-check to confirm it compiles
npm run typecheck
```
