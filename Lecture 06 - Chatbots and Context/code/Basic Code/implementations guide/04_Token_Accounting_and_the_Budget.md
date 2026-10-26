# Chapter 04: Token Accounting & the Budget

> **Chapter goal:** make the context window measurable. Two counting tiers, a per-message overhead, and a
> function that lets you *see* the quadratic bill that naive history appending produces.
> **Notes chapters covered:** 02 §02.4 (the two-tier estimate), §02.5 (the $O(N^2)$ accumulation problem),
> §02.9 (the budget is derived, not guessed), §07.8 (content words are the verifier's unit).

---

## 4.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/token.service.ts` | Tier-1 estimate · Tier-2 exact count · per-message overhead · content words · the $O(N^2)$ projection |

---

## 4.2 Commands

```bash
npm run typecheck
```

---

## 4.3 `src/services/token.service.ts` (full file)

```ts
import { countTokens as exactCount } from 'gpt-tokenizer';
import type { ChatTurn } from '../types/chat.types.js';

/**
 * Chapter 02 §02.4 — token arithmetic, in two tiers.
 *
 * Tier 1 (estimate) is used to *decide*: it runs on every candidate message
 * during trimming, so it must be free.
 * Tier 2 (exact) is used to *report and to enforce*: it runs once, on the final
 * assembled payload. Never mix the two roles.
 */

/** Every message carries role/separator overhead on top of its content. */
export const MESSAGE_OVERHEAD_TOKENS = 4;

/** Content words only — punctuation and short stopwords are noise (§07.8). */
export const contentWords = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4);

/** Chapter 02 §02.4 tier 1 — the cheap heuristic: 1 token ≈ 4 characters. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/** Chapter 02 §02.4 tier 2 — the real BPE encoder, for billing and hard limits. */
export const countTokens = (text: string): number => exactCount(text);

/** The estimate for a whole message array, including per-message overhead. */
export const estimateTokensOfTurns = (turns: ChatTurn[]): number =>
  turns.reduce((total, turn) => total + estimateTokens(turn.content) + MESSAGE_OVERHEAD_TOKENS, 0);

/**
 * Chapter 02 §02.5 — the quadratic accumulation problem.
 *
 * Naive appending resends every prior turn on every request, so turn k costs
 * `S + (k-1)·Δ + Q`. The per-request cost looks reasonable; the *cumulative*
 * bill grows quadratically. A managed window is bounded, so it grows linearly.
 */
export interface AccumulationRow {
  turn: number;
  naiveInputTokens: number; // this request, naive appending
  naiveCumulativeTokens: number; // Σ of every request so far
  managedInputTokens: number; // this request, bounded window
  managedCumulativeTokens: number;
}

export const projectAccumulation = (options: {
  turns: number;
  systemTokens: number; // S
  expansionPerTurn: number; // Δ = U + A
  windowTurns: number; // how many turns the managed window keeps
  inputBudget: number; // B_input — the hard ceiling
}): AccumulationRow[] => {
  const { turns, systemTokens, expansionPerTurn, windowTurns, inputBudget } = options;

  let naiveCumulative = 0;
  let managedCumulative = 0;

  return Array.from({ length: turns }, (_unused, index) => {
    const turn = index + 1;

    const naiveInputTokens = systemTokens + turn * expansionPerTurn;
    const managedInputTokens = Math.min(systemTokens + Math.min(turn, windowTurns) * expansionPerTurn, inputBudget);

    naiveCumulative += naiveInputTokens;
    managedCumulative += managedInputTokens;

    return { turn, naiveInputTokens, naiveCumulativeTokens: naiveCumulative, managedInputTokens, managedCumulativeTokens: managedCumulative };
  });
};
```

### Block by block

**The two imports and what they cost.**

```ts
import { countTokens as exactCount } from 'gpt-tokenizer';
```

The alias matters: this module exports its own `countTokens`, and shadowing the library name would make the
implementation read as infinite recursion. The import is a *pure-JS BPE encoder*, so it works offline and in
the browser — no WASM download, no network call on the hot path.

**`MESSAGE_OVERHEAD_TOKENS = 4`** — the overhead every message carries on top of its text (role token,
separators, the template the provider wraps around it). Ignoring this is the most common reason a "we fit"
estimate does not fit. Four is a small, safe constant; the point is that it exists and is *added* in one
place.

**Tier 1 — `estimateTokens`.**

```ts
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
```

Exactly the notes' pseudo-code, and deliberately approximate. §02.4 lists why that is acceptable:
it is free (no model, no WASM), it slightly **over**-estimates English prose, and over-estimating is the safe
direction because you reserve a little too much. The comment at the top of the file states the division of
labour that the notes insist on: *Tier 1 is used to decide; Tier 2 is used to report and to enforce.*

**Tier 2 — `countTokens`.**

```ts
export const countTokens = (text: string): number => exactCount(text);
```

One line, because the value is not in the implementation — it is in *where it is called*. This lab calls it
exactly once, on the final assembled payload, in `POST /api/context/preview`. §02.4: *"Never mix the two."*

**`estimateTokensOfTurns`** — the whole-array cost, including per-message overhead. Note the name: it says
*estimate*, because it is. A function that silently mixed tiers would be the bug §02.4 warns about.

**`contentWords`** — content words only: lowercased, punctuation stripped, words of five characters or
fewer dropped. It lives here rather than in the verifier because three services need it
(`memory.service`, `context.service`, `guardrail.service`). Chapter 07 §07.8 defines the rule:
*"keep only content words; punctuation and stopwords are noise."*

**`projectAccumulation` — the $O(N^2)$ demonstration.**

```ts
const naiveInputTokens = systemTokens + turn * expansionPerTurn;
const managedInputTokens = Math.min(systemTokens + Math.min(turn, windowTurns) * expansionPerTurn, inputBudget);
```

Two expressions, and they are the entire of chapter 02 §02.5:

| | Naive appending | Managed window |
| :--- | :--- | :--- |
| This request | $S + k\Delta$ — grows with $k$ | $S + \min(k, M)\Delta$ — flattens once $k > M$ |
| Cumulative | $\sum$ of a growing term → **quadratic** | $\sum$ of a capped term → **linear** |
| Ceiling | none — eventually exceeds the window | `inputBudget` — a hard ceiling |

`expansionPerTurn` is the notes' $\Delta = U + A$ (average user message plus average assistant response).
The `Math.min(..., inputBudget)` clamp models the fact that a managed window cannot grow past the budget —
it evicts instead, which is chapter 05's subject.

**Why return an array of rows rather than a single number?** Because the shape of the curve is the lesson.
A single total tells you "50 turns cost 325k tokens"; the row-by-row array lets you find the turn where the
naive path crosses your budget. `POST /api/context/projection` returns the rows and a summary multiplier.

---

## 4.4 The numbers, worked

With the shipped defaults (`systemTokens: 900`, `expansionPerTurn: 220`, `windowTurns: 6`, 50 turns):

| Metric | Value |
| :--- | :--- |
| Naive cumulative input tokens | 325,500 |
| Managed cumulative input tokens | 107,700 |
| Ratio | **3.02×** |

The ratio grows with turn count — that is what "quadratic" means in practice. At 20 turns it is far smaller;
at 200 turns it is brutal. This is why chapter 02 §02.6 counts history in three currencies: tokens, money
and latency all follow the same curve.

---

## 4.5 Verify

```bash
curl -s -X POST http://localhost:8090/api/context/projection \
  -H 'x-user-id: u_101' -H 'content-type: application/json' \
  -d '{"turns":50}' | node -pe 'JSON.stringify(JSON.parse(require("fs").readFileSync(0,"utf8")).data.summary)'
# {"naiveCumulativeTokens":325500,"managedCumulativeTokens":107700,"naiveOverManaged":3.02}
```

Try `{"turns":20}` and then `{"turns":200}` and watch the multiplier move. That single number is the
business case for every strategy in the next chapter.

---

### Navigation

- **Previous:** [Chapter 03 — Session Store & Role Architecture](./03_Session_Store_and_Role_Architecture.md)
- **Next:** [Chapter 05 — Context Management Strategies](./05_Context_Management_Strategies.md)
- **Notes:** [../../notes/02_Context_Windows_and_Token_Accumulation.md](../../../notes/02_Context_Windows_and_Token_Accumulation.md)
