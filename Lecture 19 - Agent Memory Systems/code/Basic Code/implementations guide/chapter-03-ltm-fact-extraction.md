# Chapter 03 — Long-Term Memory & Fact Extraction

**Notes source:** `Lecture 19 - Agent Memory Systems/notes/03_Long_Term_Memory_Taxonomy_and_Fact_Extraction.md`

**Goal:** Implement Long-Term Memory (LTM) — persistent facts extracted from conversation, stored per user, and retrievable by relevance. This is Chapter 03 because LTM feeds the context assembler in Chapter 04.

---

## 1. `src/services/ltm.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/ltm.ts` |
| Chapter | 03 (also used by Chapters 04, 05, 06) |
| What it does | Stores `Memory` objects per user (facts with timestamps, hit count, confidence, version). `searchMemories` ranks them by vector similarity and returns top-K. Also holds scoring helpers used by eviction (Chapter 5) and dreaming (Chapter 6). |

### Full code

```ts
import type { Memory, MemorySearchResult } from "../types";
import { config } from "../config/config";

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

/** Rough token counter: 1 token ≈ 4 characters. */
export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Deterministic "embedding": a stable small vector from text so search works
 * without an external embedding API. (Swap for real embeddings in production,
 * as Chapter 3 describes.)
 */
function embed(text: string): number[] {
  const vector = new Array(8).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < 8; i++) {
    vector[i] = ((hash >> (i * 4)) & 0xf) / 15;
  }
  return vector;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

const memories: Memory[] = [];

/** Long-Term Memory (Chapters 3, 4, 5).
 *
 * Stores extracted facts per user with metadata (timestamps, hit count,
 * confidence, version). Search returns only the most relevant memories so the
 * prompt stays small instead of loading everything every request.
 */

/** Add one memory, skipping exact duplicates already stored for this user. */
export function addMemory(input: {
  userId: string;
  content: string;
  confidence: number;
  source: string;
}): Memory | null {
  const exists = memories.find(
    (m) =>
      m.userId === input.userId &&
      m.content.toLowerCase() === input.content.toLowerCase()
  );
  if (exists) return null;

  const memory: Memory = {
    id: uid(),
    userId: input.userId,
    content: input.content,
    createdAt: now(),
    updatedAt: now(),
    lastAccessedAt: now(),
    hitCount: 0,
    version: 1,
    confidence: input.confidence,
    source: input.source,
  };
  memories.push(memory);
  return memory;
}

/** Search memories for a user. Simple semantic-style ranking via vector
 * similarity on the deterministic embedding. Returns top-K.
 */
export function searchMemories(
  userId: string,
  query: string,
  topK: number
): MemorySearchResult[] {
  const queryVec = embed(query);
  const scored = memories
    .filter((m) => m.userId === userId)
    .map((m) => ({
      memory: m,
      score: cosine(queryVec, embed(m.content)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  for (const result of scored) {
    result.memory.lastAccessedAt = now();
    result.memory.hitCount += 1;
  }
  return scored;
}

/** Record that a memory was used (updates hit tracking for eviction). */
export function recordHit(memoryId: string): void {
  const memory = memories.find((m) => m.id === memoryId);
  if (!memory) return;
  memory.lastAccessedAt = now();
  memory.hitCount += 1;
}

/** Score a memory: frequency + recency. Low scores are eviction candidates. */
export function memoryScore(memory: Memory): number {
  const ageDays =
    (Date.now() - new Date(memory.lastAccessedAt).getTime()) /
    (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 30 - ageDays);
  return memory.hitCount + recencyScore;
}

/** Find memories below the eviction score threshold. */
export function findEvictionCandidates(threshold: number): Memory[] {
  return memories.filter((m) => memoryScore(m) < threshold);
}

/** Delete a memory by id. */
export function deleteMemory(memoryId: string): boolean {
  const index = memories.findIndex((m) => m.id === memoryId);
  if (index === -1) return false;
  memories.splice(index, 1);
  return true;
}

/** All memories for a user (used by background reflection). */
export function getMemories(userId: string): Memory[] {
  return memories.filter((m) => m.userId === userId);
}

export { embed };
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `const memories: Memory[] = []` | The in-memory LTM store. One array holds every fact for every user, isolated by `userId`. |
| `Memory` interface | `id, userId, content, createdAt, updatedAt, lastAccessedAt, hitCount, version, confidence, source` — matches Chapter 3's memory metadata (timestamps, versioning, confidence). |
| `addMemory(...)` | Creates a memory with `uid()` and `now()`, but returns `null` if an exact duplicate already exists for this user (deduplication on write, Chapter 3). |
| `searchMemories(..., topK)` | Embeds the query and each memory with the deterministic `embed()`, ranks by cosine similarity, returns top-K. Only the relevant facts enter the prompt — this is how LTM avoids context inflation (Chapter 4). |
| `memoryScore(...)` | `hits + max(0, 30 - ageDays)` — frequency plus recency, exactly as Chapter 5 describes. |
| `findEvictionCandidates(...)` | Returns memories below the score threshold — eviction candidates (Chapter 5). |

---

## 2. `src/services/extraction.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/extraction.ts` |
| Chapter | 03 |
| What it does | Turns raw user messages into candidate facts and stores the confident ones in LTM. This basic build uses a small heuristic so it runs without an LLM key; swap in an LLM-based extractor (as Chapter 3 describes) when a key is available. |

### Full code

```ts
import type { Memory } from "../types";
import { config } from "../config/config";
import { addMemory } from "./ltm";

/** Fact extraction (Chapter 3).
 *
 * Turns raw conversation into persistent facts. This basic implementation uses
 * a small heuristic so it runs without an LLM key; swap in an LLM-based
 * extractor (as Chapter 3 describes) when a key is available.
 */

const FACT_PREFIXES = [
  "my name is",
  "i am",
  "i live in",
  "i prefer",
  "i like",
  "i work at",
  "i am allergic to",
];

function extractCandidateFacts(text: string): string[] {
  const lower = text.toLowerCase().trim();
  return FACT_PREFIXES.filter((prefix) => lower.startsWith(prefix)).map(
    (prefix) => {
      const rest = text.slice(prefix.length).trim();
      return `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}${rest ? " " : ""}${rest}`;
    }
  );
}

/** Extract facts from a user message and store the confident ones in LTM. */
export function extractAndStoreFacts(input: {
  userId: string;
  message: string;
  source: string;
}): Memory[] {
  const facts: Memory[] = [];
  for (const content of extractCandidateFacts(input.message)) {
    const memory = addMemory({
      userId: input.userId,
      content,
      confidence: 0.8,
      source: input.source,
    });
    if (memory && memory.confidence >= config.factConfidenceThreshold) {
      facts.push(memory);
    }
  }
  return facts;
}
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `FACT_PREFIXES` | Sentence starters that usually contain a persistent fact about the user (name, location, preferences, allergies). |
| `extractCandidateFacts(...)` | If a message starts with a known prefix, pull it out as a candidate fact. |
| `extractAndStoreFacts(...)` | For each candidate, call `addMemory` (which dedups) and keep it only if confidence meets `config.factConfidenceThreshold` (default 0.7, Chapter 3). |

### Command

```bash
# Send "my name is Aminul" -> newFacts: 1. Send it again -> newFacts: 0 (dedup).
npm run dev
curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' \
  -d '{"userId":"u1","sessionId":"s1","message":"my name is Aminul"}'
```

