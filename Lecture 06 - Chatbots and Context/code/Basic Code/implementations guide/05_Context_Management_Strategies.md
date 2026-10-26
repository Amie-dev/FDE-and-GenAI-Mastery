# Chapter 05: Context Management Strategies

> **Chapter goal:** implement the four levers — retain, compress, retrieve, evict — as one manager with a
> declarative policy, and keep the expensive one (compaction) off the hot path.
> **Notes chapters covered:** 03 §03.2 (sliding window), §03.3 (pinned anchor), §03.5 (semantic recall),
> §03.6 (the layered pipeline), §03.8 (the reference implementation), §02.9 (tier accounting).

---

## 5.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/context.service.ts` | `takeNewestWithinBudget` · `recallHistoricalTurns` · `assembleContext` (the layered pipeline) |

This file is the **hot path**. It makes no model calls, allocates almost nothing, and is deterministic — so
you can call it on every request without thinking about latency.

---

## 5.2 Commands

```bash
npm run typecheck
```

---

## 5.3 `src/services/context.service.ts` (full file)

```ts
import { config, CONTEXT_POLICY } from '../config/config.js';
import type { AssemblyReport, ChatTurn, KbChunk, SessionState, Tier, UserFact } from '../types/chat.types.js';
import { buildGroundedSystemPrompt, renderContext } from './grounding.service.js';
import { renderFacts } from './memory.service.js';
import { MESSAGE_OVERHEAD_TOKENS, contentWords, estimateTokens } from './token.service.js';

/**
 * Chapter 03 — the context manager.
 *
 * One manager with a declarative policy beats five bespoke code paths (§03.8).
 * `assembleContext` is the HOT PATH: pure, deterministic, allocation-light and
 * free of model calls. Compaction costs a model call, so it lives in
 * `chat.service.ts` and runs AFTER the response (chapter 03 §03.7 design rule).
 */

/** §03.8 step 3 — the only subtle loop: a newest-first walk with a hard guarantee. */
export const takeNewestWithinBudget = (turns: ChatTurn[], budget: number): ChatTurn[] => {
  const kept: ChatTurn[] = [];
  let used = 0;

  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index]!;
    const cost = estimateTokens(turn.content) + MESSAGE_OVERHEAD_TOKENS;
    // The `kept.length > 0` guard prevents the empty-history failure mode (§03.2).
    if (used + cost > budget && kept.length > 0) break;
    kept.unshift(turn);
    used += cost;
  }

  return kept;
};

/**
 * §03.5 — semantic recall over historical turns.
 * Keyword overlap stands in for a vector store; the contract is the same:
 * retrieve by *relevance*, and never let recall replace chronological recency.
 */
export const recallHistoricalTurns = (turns: ChatTurn[], query: string, k: number): ChatTurn[] => {
  if (k <= 0) return [];

  const terms = contentWords(query);
  if (terms.length === 0) return [];

  return turns
    .map((turn, index) => {
      const haystack = turn.content.toLowerCase();
      return { turn, index, score: terms.filter((term) => haystack.includes(term)).length };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, k)
    .map((row) => row.turn);
};

/**
 * Chapter 03 §03.6 — the layered pipeline, assembled in time-horizon order.
 * Layer 0 system · 1 memory · 2 summary · 3 anchor · 4 recall · 5 recent · 6 current.
 */
export const assembleContext = (session: SessionState, query: string, facts: UserFact[], chunks: KbChunk[]): AssemblyReport => {
  const policy = CONTEXT_POLICY;
  const notes: string[] = [];
  const messages: ChatTurn[] = [];
  const tokensByTier: Record<Tier, number> = { system: 0, memory: 0, grounded: 0, history: 0, current: 0 };

  const push = (tier: Tier, turn: ChatTurn): void => {
    messages.push(turn);
    tokensByTier[tier] += estimateTokens(turn.content) + MESSAGE_OVERHEAD_TOKENS;
  };

  // ---- Layer 0 — system prompt & SOP: deploy-time, never dropped (§03.6) ----
  push('system', { role: 'system', content: buildGroundedSystemPrompt() });

  // ---- Layer 1 — durable user memory: permanent, high priority (§04.9) ----
  if (facts.length > 0) push('memory', { role: 'system', content: renderFacts(facts) });

  // ---- Layer 2 — running summary: compressed older turns (§03.4) ----
  if (session.runningSummary) {
    push('history', { role: 'system', content: `[CONVERSATION BACKGROUND]\n${session.runningSummary}` });
  }

  // ---- Layer 2b — grounding: the evidence block the refusal policy refers to (§07.4) ----
  push('grounded', { role: 'system', content: `[CONTEXT]\n${renderContext(chunks)}` });

  // ---- Layer 3 — pinned anchor: the first K turns, where the scope was set (§03.3) ----
  const anchor = policy.anchorTurns > 0 ? session.turns.slice(0, policy.anchorTurns) : [];
  const rest = session.turns.slice(anchor.length);
  for (const turn of anchor) push('history', turn);
  if (anchor.length > 0) notes.push(`anchor: first ${anchor.length} turn(s) pinned (K=${policy.anchorTurns}).`);

  // ---- Layer 4 — semantic recall (§03.5) ----
  // The recall pool is the durable transcript plus whatever middle turns are still
  // hot. In production this is a vector index over the cold store, not an array scan,
  // and recall is always ADDITIVE — it never replaces chronological recency.
  const hotMiddle = rest.slice(0, Math.max(0, rest.length - policy.recentTurns));
  const recalled = recallHistoricalTurns([...session.compacted, ...hotMiddle], query, policy.semanticRecall);
  if (recalled.length > 0) {
    const block = ['[RELEVANT EARLIER TURNS]', ...recalled.map((turn) => `${turn.role}: ${turn.content}`)].join('\n');
    push('history', { role: 'system', content: block });
    notes.push(`semantic recall: ${recalled.length} earlier turn(s) re-injected (k=${policy.semanticRecall}).`);
  }

  // ---- Layer 5 — recent verbatim window: token-budgeted, newest first (§03.2) ----
  const recalledSet = new Set(recalled);
  const pool = rest.filter((turn) => !recalledSet.has(turn));
  const historyBudget = Math.max(0, policy.budgetTokens - tokensByTier.history);
  const recent = takeNewestWithinBudget(pool, historyBudget);
  for (const turn of recent) push('history', turn);

  const historyTrimmed = pool.length - recent.length;
  if (historyTrimmed > 0) notes.push(`eviction: ${historyTrimmed} older turn(s) dropped from the verbatim window.`);

  // ---- Layer 6 — the current turn: never truncated (§02.9 tier 5) ----
  push('current', { role: 'user', content: query });

  const inputTokens = Object.values(tokensByTier).reduce((total, value) => total + value, 0);

  return {
    messages,
    tokensByTier,
    inputTokens,
    outputReserve: config.AI_MAX_TOKENS,
    contextWindow: config.CONTEXT_WINDOW_TOKENS,
    historyKept: recent.length,
    historyTrimmed,
    anchorTurns: anchor.length,
    recalledTurns: recalled.length,
    summaryPresent: Boolean(session.runningSummary),
    // Chapter 02 §02.1 — L_input + L_output <= C_max, or you starve the answer.
    fits: inputTokens + config.AI_MAX_TOKENS <= config.CONTEXT_WINDOW_TOKENS,
    notes,
  };
};
```

### Block by block

**`takeNewestWithinBudget` — the only subtle loop (§03.8 step 3).**

```ts
for (let index = turns.length - 1; index >= 0; index -= 1) {
  const turn = turns[index]!;
  const cost = estimateTokens(turn.content) + MESSAGE_OVERHEAD_TOKENS;
  if (used + cost > budget && kept.length > 0) break;
  kept.unshift(turn);
  used += cost;
}
```

Four decisions are packed into five lines, and each one is a notes section:

| Decision | Notes reason |
| :--- | :--- |
| **Walk backwards** (`index--`) | *"recency is the strongest relevance signal for conversational continuity"* — §03.2 |
| **`kept.unshift`, not `push`** | The walk is newest-first but the payload must be oldest-first, or the transcript reads backwards |
| **`&& kept.length > 0`** | The guard from §03.2: never return an empty history. One oversized turn must not wipe the window |
| **Estimate, not exact count** | §02.4: this runs on every candidate message, so it must be free |

**`recallHistoricalTurns` — Strategy 4, semantic recall (§03.5).**

```ts
const terms = contentWords(query);
if (terms.length === 0) return [];
```

The early exit matters: a query made entirely of short words ("is it ok?") has no content words, so recall
would return arbitrary turns. Returning nothing is the honest answer.

```ts
.sort((a, b) => b.score - a.score || a.index - b.index)
```

Two-key sort: highest overlap first, then **oldest first** as a tie-break. The tie-break is not cosmetic —
it makes the output deterministic, which means a given conversation always assembles the same payload. That
is what makes prompt caching possible (ch 03 §03.9) and what makes a bug reproducible.

The keyword overlap stands in for a vector store. The *interface* is what the notes care about: retrieve by
relevance, cap at $k$, and carry a score so the caller can rank. Lecture 16 replaces the body of this
function with an embedding lookup and changes nothing else.

**`assembleContext` — the layered pipeline (§03.6).** One function, seven layers, in time-horizon order:

| # | Layer | Code | Notes |
| :--- | :--- | :--- | :--- |
| 0 | System prompt & SOP | `buildGroundedSystemPrompt()` | §03.6 layer 0 — *immutable, deploy-time*, never dropped |
| 1 | Durable user memory | `renderFacts(facts)` | §03.6 layer 1 — *permanent, DB read* |
| 2 | Running summary | `[CONVERSATION BACKGROUND]` | §03.6 layer 2 — *session, old, summarisation* |
| 2b | Grounding | `[CONTEXT]` + `renderContext(chunks)` | §07.4 — the evidence the refusal policy refers to |
| 3 | Pinned anchor | `session.turns.slice(0, K)` | §03.3 — *session, start, anchor* |
| 4 | Semantic recall | `recallHistoricalTurns(...)` | §03.5 — *any, vector retrieval* |
| 5 | Recent verbatim window | `takeNewestWithinBudget(pool, budget)` | §03.2 — *session, recent, token-budgeted* |
| 6 | Current user turn | `push('current', { role: 'user', … })` | §03.6 layer 6 — *never dropped* |

Four things in the body deserve a closer look.

**(a) The `push` helper does two jobs at once.**

```ts
const push = (tier: Tier, turn: ChatTurn): void => {
  messages.push(turn);
  tokensByTier[tier] += estimateTokens(turn.content) + MESSAGE_OVERHEAD_TOKENS;
};
```

Appending a message and accounting for it are the *same operation*, so they cannot drift apart. This is
chapter 02 §02.9 step 4 — "instrument the budget" — implemented structurally rather than bolted on later.

**(b) The recall pool is the cold store plus the hot middle.**

```ts
const hotMiddle = rest.slice(0, Math.max(0, rest.length - policy.recentTurns));
const recalled = recallHistoricalTurns([...session.compacted, ...hotMiddle], query, policy.semanticRecall);
```

`session.compacted` is the durable transcript that compaction moved out of the hot path. Without it, recall
would go blind the moment the conversation got long enough to compact — which is precisely when recall
matters most. §03.5 calls this *"semantic RAG over historical memory"*.

**(c) Recall is additive, and duplicates are removed.**

```ts
const recalledSet = new Set(recalled);
const pool = rest.filter((turn) => !recalledSet.has(turn));
```

The recent window is built from what recall did **not** already inject. §03.8 lists this as a deliberate
property: *"Semantic recall is additive, never a replacement — preserves chronological precedence."*
A recalled turn appears once, as a `[RELEVANT EARLIER TURNS]` block; it never also appears verbatim.

**(d) The budget is handed down, not guessed.**

```ts
const historyBudget = Math.max(0, policy.budgetTokens - tokensByTier.history);
const recent = takeNewestWithinBudget(pool, historyBudget);
```

By this point the summary and the anchor have already charged the history tier, so the recent window gets
*what is left*. That is the whole design of §03.6: the highest-priority layers are paid for first, and the
elastic layer absorbs the pressure. Chapter 02 §02.9 said it directly — *"only one tier is elastic."*

**The report is the deliverable, not a debug afterthought.** `AssemblyReport` carries the per-tier token
counts, how many turns were kept, trimmed, anchored and recalled, whether a summary was present, whether the
payload fits, and a human-readable `notes` array. Every claim the notes make about the pipeline is visible in
one object.

---

## 5.4 What you will see in practice

After ~10 turns of a live conversation, `/api/chat` returns a context report like this:

| Signal | Observed value | What it proves |
| :--- | :--- | :--- |
| `anchorTurns` | `2` | The **original** first turns are still pinned, even after compaction |
| `summaryPresent` | `true` | Compaction ran (the turn count passed the threshold) |
| `recalledTurns` | `3` | Semantic recall reached into the cold transcript |
| `historyKept` | `6` | The recent window is at its configured size $M$ |
| `tokensByTier.history` | ~420 | Summary + anchor + recalled + recent, all charged to one tier |

And the payload itself shows the layers in order: `system` → `[CONVERSATION BACKGROUND]` → `[CONTEXT]` →
anchor turns → `[RELEVANT EARLIER TURNS]` → recent turns → the current question.

---

## 5.5 Verify

```bash
SID=$(curl -s -X POST http://localhost:8090/api/session -H 'x-user-id: u_101' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.sessionId')

# 12 turns, then inspect the 12th payload
for i in $(seq 1 12); do
  curl -s -X POST http://localhost:8090/api/chat -H 'x-user-id: u_101' -H 'content-type: application/json' \
    -d "{\"sessionId\":\"$SID\",\"message\":\"Turn $i: what is the late delivery credit policy?\"}" > /dev/null
done

curl -s -X POST http://localhost:8090/api/context/preview -H 'x-user-id: u_101' -H 'content-type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"message\":\"late delivery credit\"}" \
  | node -pe 'const b=JSON.parse(require("fs").readFileSync(0,"utf8")).data.budget; JSON.stringify(b.notes)'
# ["anchor: first 2 turn(s) pinned (K=2).","semantic recall: 3 earlier turn(s) re-injected (k=3)."]
```

> **Note:** `/api/context/preview` never writes, so you can hammer it while tuning the `.env` policy values.
> Change `RECENT_TURNS` to `2`, restart, and watch `historyKept` and `tokensByTier.history` move.

---

### Navigation

- **Previous:** [Chapter 04 — Token Accounting & the Budget](./04_Token_Accounting_and_the_Budget.md)
- **Next:** [Chapter 06 — Application Memory vs Model Weights](./06_Application_Memory_vs_Model_Weights.md)
- **Notes:** [../../notes/03_Context_Management_Strategies.md](../../../notes/03_Context_Management_Strategies.md)
