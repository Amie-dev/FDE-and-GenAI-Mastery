# Chapter 04 — Dynamic Context Assembly (STM + LTM + Query)

**Notes source:** `Lecture 19 - Agent Memory Systems/notes/04_Dynamic_Context_Assembly_Stm_Ltm_Rag_Query.md`

**Goal:** Combine Short-Term Memory, Long-Term Memory, and the current Query into one LLM prompt inside a token budget. This is Chapter 04 because it is the heart of the lecture: `Context = System Prompt + STM + LTM + Query`.

---

## 1. `src/services/context.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/context.ts` |
| Chapter | 04 |
| What it does | `assembleContext(...)` builds the message array: system prompt → LTM memories → STM messages → current query. Each part is trimmed so the total stays inside `maxTokens`. |

### Full code

```ts
import type { Message, Memory } from "../types";
import { config } from "../config/config";
import { countTokens } from "./ltm";

/** Context assembly (Chapter 4).
 *
 * Builds the final LLM prompt from four parts:
 *   System prompt → LTM memories → STM messages → current Query
 * Each part is trimmed so the total stays inside the token budget. Order
 * matters: recent STM first, persistent LTM next, current query last.
 */

export interface ContextOptions {
  systemPrompt: string;
  ltmMemories: Memory[];
  stmMessages: Message[];
  currentQuery: string;
  maxTokens?: number;
}

function itemTokens(item: { content: string }): number {
  return countTokens(item.content);
}

export function assembleContext(options: ContextOptions): {
  messages: { role: string; content: string }[];
  tokenBudget: { used: number; max: number };
} {
  const {
    systemPrompt,
    ltmMemories,
    stmMessages,
    currentQuery,
    maxTokens = config.maxContextTokens,
  } = options;

  const messages: { role: string; content: string }[] = [];
  let used = 0;

  // 1. System prompt — fixed cost, always first.
  const system = { role: "system", content: systemPrompt };
  used += itemTokens(system);
  messages.push(system);

  // 2. LTM memories — persistent facts, newest first.
  for (const memory of ltmMemories) {
    const item = { role: "system", content: `Memory: ${memory.content}` };
    if (used + itemTokens(item) > maxTokens) break;
    used += itemTokens(item);
    messages.push(item);
  }

  // 3. STM messages — recent conversation, oldest-first inside the window.
  for (let i = stmMessages.length - 1; i >= 0; i--) {
    const item = stmMessages[i];
    if (used + itemTokens(item) > maxTokens) break;
    used += itemTokens(item);
    messages.push(item);
  }

  // 4. Current query — added only if room remains.
  const query = { role: "user", content: currentQuery };
  if (used + itemTokens(query) <= maxTokens) {
    used += itemTokens(query);
    messages.push(query);
  }

  return { messages, tokenBudget: { used, max: maxTokens } };
}
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `system` block | Adds the system prompt first. Fixed cost, always present. |
| LTM loop | Adds `Memory: <content>` as system messages until the budget would be exceeded, then stops. LTM brings in persistent facts from earlier sessions (Chapter 3). |
| STM loop | Walks the sliding window backwards (newest first) and appends until the budget would be exceeded. Keeps the most recent turns (Chapter 2). |
| Query block | Adds the current user message only if room remains. The query always gets priority for the last few tokens. |
| Return | Returns the built `messages` array plus `tokenBudget.used / max` so the caller can see how much of the budget was consumed. |

### Why this order

Chapter 4 says order matters: STM (recent) → LTM (persistent) → Query (current). The model pays most attention to recent tokens, so the conversation's latest turns and the current query sit closest to the generation point, while older persistent facts sit just after the system prompt.

### Budget example

With `MAX_CONTEXT_TOKENS=2000`: a 400-token system prompt + 3 LTM memories (~150 tokens each) + 6 STM turns (~80 tokens each) + the query stays well under the limit. If it does not fit, the oldest STM/LTM items are dropped first (graceful degradation, Chapter 4).

### Command

```bash
# Each /api/chat response includes tokenBudget.used / max
npm run dev
```
