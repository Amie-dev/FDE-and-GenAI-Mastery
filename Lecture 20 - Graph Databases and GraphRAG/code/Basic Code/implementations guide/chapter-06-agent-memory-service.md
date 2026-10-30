# Chapter 06 — Agent Memory Service

**Notes source:** `notes/07_AI_Agent_Memory_Systems.md`

**Goal:** Implement STM (short-term sliding window) and LTM helper wrappers.

---

## 1. `src/services/memory.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/memory.ts` |
| Chapter | 06 (supports Chapters 07–08) |
| What it does | Agent memory helpers: in-memory STM map + LTM fact creation/search stubs. |

### Full code

```ts
import { Memory, MemorySearchResult } from "../types";
import { config } from "../config/config";

/** Agent memory helpers (Chapter 07).
 * STM = short-term sliding window; LTM = long-term facts.
 */
export class AgentMemory {
  private stm = new Map<string, { messages: { role: string; content: string }[] }>();

  appendMessage(sessionId: string, message: { role: string; content: string }): void {
    let sess = this.stm.get(sessionId);
    if (!sess) {
      sess = { messages: [] };
      this.stm.set(sessionId, sess);
    }
    sess.messages.push(message);
  }

  recentMessages(sessionId: string, n: number): { role: string; content: string }[] {
    const sess = this.stm.get(sessionId);
    if (!sess) return [];
    return sess.messages.slice(-n);
  }

  addFact(fact: {
    userId: string;
    content: string;
    confidence?: number;
    source?: string;
  }): Memory {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      userId: fact.userId,
      content: fact.content,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      hitCount: 0,
      version: 1,
      confidence: fact.confidence ?? 0.8,
      source: fact.source ?? "user",
    };
  }

  searchFacts(userId: string, query: string, topK = config.ltmTopK): MemorySearchResult[] {
    // Production: query Neo4j graph for facts related to userId.
    // Basic code returns an empty list to keep the app minimal.
    return [];
  }
}
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `private stm = new Map(...)` | Holds in-memory sessions; each session stores a message array. |
| `appendMessage` | Adds a message to the session (creates session if missing). |
| `recentMessages` | Returns last `n` messages via `slice(-n)` — the sliding window. |
| `addFact` | Creates a `Memory` record with UUID, timestamps, confidence, source. |
| `searchFacts` | Returns top-K LTM facts; production would Cypher-query Neo4j. Basic code returns `[]`. |

### Command

```bash
npm run typecheck
```

### Self-check

1. Why is `slice(-n)` called a sliding window? → keeps last N messages, drops older ones.