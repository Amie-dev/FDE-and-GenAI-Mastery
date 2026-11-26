# Chapter 06 — Claude-Style Memory Dreaming & Background Reflection

**Notes source:** `Lecture 19 - Agent Memory Systems/notes/06_Claude_Style_Memory_Dreaming_and_Background_Reflection.md`

**Goal:** Implement a background reflection process that cleans the memory store without blocking the user request path. This is Chapter 06 because dreaming runs after (and independently of) the chat flow.

---

## 1. `src/services/dream.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/dream.ts` |
| Chapter | 06 |
| What it does | `runDream(userId)` loads a user's memories, removes exact duplicates, evicts low-value memories (Chapter 5 scoring), and reports every action taken. |

### Full code

```ts
import type { Memory } from "../types";
import { config } from "../config/config";
import {
  getMemories,
  deleteMemory,
  findEvictionCandidates,
  memoryScore,
} from "./ltm";

/** Memory dreaming / background reflection (Chapter 6).
 *
 * Runs outside the user request path. It loads a user's memories, cleans
 * duplicates and low-value memories, and reports what it did.
 */

export interface DreamResult {
  totalMemories: number;
  duplicatesRemoved: number;
  evicted: number;
  actions: string[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Run one reflection cycle for a user. */
export function runDream(userId: string): DreamResult {
  const memories = getMemories(userId);
  const actions: string[] = [];
  let duplicatesRemoved = 0;
  let evicted = 0;

  // 1. Remove exact duplicates, keeping the first occurrence.
  const seen = new Set<string>();
  for (const memory of memories) {
    const key = normalize(memory.content);
    if (seen.has(key)) {
      deleteMemory(memory.id);
      duplicatesRemoved += 1;
      actions.push(`removed duplicate: ${memory.content}`);
    } else {
      seen.add(key);
    }
  }

  // 2. Evict low-value memories (few hits and old last access).
  const remaining = getMemories(userId);
  for (const memory of findEvictionCandidates(config.evictionScoreThreshold)) {
    if (!remaining.some((m) => m.id === memory.id)) continue;
    deleteMemory(memory.id);
    evicted += 1;
    actions.push(
      `evicted low-value memory (score ${memoryScore(memory)}): ${memory.content}`
    );
  }

  return {
    totalMemories: memories.length,
    duplicatesRemoved,
    evicted,
    actions,
  };
}
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `getMemories(userId)` | Loads every memory for the user — the first step of every dreaming cycle (Chapter 6). |
| Duplicate loop | Normalizes each fact's text; if the same content was already seen, the later copy is deleted. Keeping the first occurrence preserves the original `createdAt`. |
| Eviction loop | Reuses `findEvictionCandidates` + `deleteMemory` from Chapter 5 to remove low-score memories. |
| Return | `DreamResult` with totals and a human-readable `actions` array. |

### Why background

Chapter 6 stresses that the main conversation flow must stay fast: memory cleanup happens asynchronously. In this basic build `POST /api/dream` triggers the job on demand; in production it runs on a schedule (e.g. every 24 hours) via a job queue, never inside `/api/chat`.

### Command

```bash
npm run dev
curl -X POST http://localhost:3000/api/dream -H 'Content-Type: application/json' -d '{"userId":"u1"}'
# Response: { ok: true, totalMemories: 1, duplicatesRemoved: 0, evicted: 0, actions: [] }
```
