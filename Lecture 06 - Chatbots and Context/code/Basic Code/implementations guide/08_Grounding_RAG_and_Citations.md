# Chapter 08: Grounding, RAG & Citations

> **Chapter goal:** move the answer from parametric memory (frozen, unverifiable) to retrieved evidence
> (current, citable, auditable) — and make every chunk carry an id so the verifier has something to check.
> **Notes chapters covered:** 07 §07.2 (the seven-layer architecture, layer 2), §07.4 (RAG grounding),
> §07.11 step 2 (retrieval with a token budget).

---

## 8.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/grounding.service.ts` | the knowledge base · `searchKnowledge` · `renderContext` · `buildGroundedSystemPrompt` |

---

## 8.2 Commands

```bash
npm run typecheck
```

---

## 8.3 `src/services/grounding.service.ts` (full file)

```ts
import { REFUSAL_POLICY, SYSTEM_PROMPT } from '../config/prompts.js';
import type { KbChunk } from '../types/chat.types.js';

/**
 * Chapter 07 §07.4 — layer 2: RAG grounding.
 *
 * Grounding is the only defence that changes what the model *can* say: it moves
 * the answer from parametric memory (frozen, unverifiable) to retrieved evidence
 * (current, citable, auditable).
 *
 * This lab uses keyword overlap as the retriever. Production uses hybrid
 * vector + BM25 search with re-ranking (Lecture 16) — the interface is identical,
 * and every chunk still carries a source id.
 */

const KNOWLEDGE_BASE: KbChunk[] = [
  {
    id: 'kb_delivery_areas',
    title: 'Service areas',
    text: 'Tomato operates in Delhi, Mumbai and Bangalore. Hyderabad, Pune and Chennai are not currently served.',
  },
  {
    id: 'kb_tracking',
    title: 'Order tracking',
    text: 'Live tracking is available in the app under Orders, then Track. A rider is assigned about 10 minutes before pickup.',
  },
  {
    id: 'kb_late_order',
    title: 'Late delivery policy',
    text: 'If an order arrives more than 20 minutes past the promised ETA, the customer may claim a delivery-fee credit of up to 75 rupees via Orders, then Help, then Late delivery.',
  },
  {
    id: 'kb_missing_item',
    title: 'Missing item policy',
    text: 'A missing item must be reported within 60 minutes of delivery via Orders, then Help, then Missing item. Verified reports are refunded to the original payment method within 3 to 5 working days.',
  },
  {
    id: 'kb_compensation_cap',
    title: 'Compensation ceiling',
    text: 'Compensation is capped at the value of the order. Support agents may not promise any amount above that cap; requests above it must be routed to a human supervisor.',
  },
  {
    id: 'kb_rider_privacy',
    title: 'Rider privacy',
    text: 'Rider personal data, including full name, phone number and documents, is never disclosed to customers. Only the masked first name and the vehicle number are visible after assignment.',
  },
];

/** Chapter 07 §07.8 — the verifier needs the raw text of exactly these chunks. */
export const getChunk = (id: string): KbChunk | undefined => KNOWLEDGE_BASE.find((chunk) => chunk.id === id);

/**
 * Chapter 07 §07.4 — retrieve the top-k chunks for a query.
 * Chunks are ranked, then capped by `k`; the budget tier then caps them by tokens.
 */
export const searchKnowledge = (query: string, k: number): KbChunk[] => {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3);

  return KNOWLEDGE_BASE.map((chunk) => {
    const haystack = `${chunk.title} ${chunk.text}`.toLowerCase();
    const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
    return { ...chunk, score };
  })
    .filter((chunk) => (chunk.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, Math.max(0, k));
};

/** Chapter 07 §07.4 — every chunk is rendered *with its source id*, or it cannot be cited. */
export const renderContext = (chunks: KbChunk[]): string =>
  chunks.length === 0
    ? '(no matching records were retrieved)'
    : chunks.map((chunk) => `[${chunk.id}] ${chunk.title}: ${chunk.text}`).join('\n');

/**
 * Chapter 07 §07.11 step 4 — the calibrated, grounded system prompt.
 * Layer 0 (identity + rules) is deploy-time; only the evidence rules and the
 * context block change per request.
 */
export const buildGroundedSystemPrompt = (): string => `${SYSTEM_PROMPT}\n\n${REFUSAL_POLICY}`;
```

### Block by block

**`KNOWLEDGE_BASE` — six chunks, each with an `id`.**

```ts
{ id: 'kb_delivery_areas', title: 'Service areas',
  text: 'Tomato operates in Delhi, Mumbai and Bangalore. Hyderabad, Pune and Chennai are not currently served.' },
```

Three things about this array are load-bearing:

1. **Every chunk has a stable `id`.** Chapter 07 §07.4 is unambiguous — *"every chunk carries a source id"*.
   Without it, a citation cannot be verified and the whole of §07.8 collapses.
2. **The content is deliberately quotable.** The chunk about service areas *explicitly states the negative*
   ("Hyderabad … not currently served"), which is the exact case §07.6's refusal exemplar 1 uses. A
   knowledge base that only lists what exists cannot answer "can I order in X?" honestly.
3. **`kb_rider_privacy` exists to force a refusal.** The question *"who is the rider for order #4812?"* has a
   policy answer — *we never disclose rider personal data* — and a wrong answer (inventing a name). Having
   both a policy chunk and no rider records is what makes the refusal demonstrable rather than theoretical.

**`searchKnowledge` — ranked retrieval, capped at $k$.**

```ts
const terms = query.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((word) => word.length > 3);
```

Note the threshold here is `> 3`, while the verifier uses `> 4`. They are different questions: retrieval wants
to *recall* (a slightly broader net is fine), verification wants to be *strict* (only substantial words
count as evidence). Using one shared helper for both would be tidier but less correct.

```ts
.filter((chunk) => (chunk.score ?? 0) > 0)
.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
.slice(0, Math.max(0, k));
```

Three stages, in the order every retriever uses them: **filter** (drop irrelevant), **rank** (best first),
**cap** (respect the budget). The `k` comes from `RAG_TOP_K` in `.env`, which is tier 2's cap in chapter 02
§02.9 — *"reduce K; re-rank; summarise chunks"* is the documented remedy when tier 2 is over budget.

**Why keyword overlap and not a vector store?** Because the *interface* is the lesson. `searchKnowledge`
returns ranked `KbChunk[]`; replacing its body with an embedding lookup and a cosine search changes nothing
about the caller, the prompt, the citations or the verifier. Chapter 07 §07.4 says production uses
*"hybrid vector + BM25 search with re-ranking (Lecture 16)"* — that is a swap, not a redesign.

**`renderContext` — the one place a chunk becomes evidence.**

```ts
chunks.length === 0
  ? '(no matching records were retrieved)'
  : chunks.map((chunk) => `[${chunk.id}] ${chunk.title}: ${chunk.text}`).join('\n');
```

Two decisions:

- **The id is in the rendered text.** The model can only cite `kb_late_order` if it *sees* `kb_late_order`.
  Putting the id in the prompt is what makes rule 6 of the refusal policy achievable.
- **The empty case is explicit.** `'(no matching records were retrieved)'` is a strong, legible signal to the
  model that it has no evidence — far better than an empty `[CONTEXT]` block, which reads like a formatting
  glitch and invites the model to fill the silence from parametric memory.

**`buildGroundedSystemPrompt` — layer 0 plus the evidence rules.**

```ts
export const buildGroundedSystemPrompt = (): string => `${SYSTEM_PROMPT}\n\n${REFUSAL_POLICY}`;
```

Two deploy-time artefacts concatenated in a fixed order, and that is the entire function. The split matters:
the 4 Pillars (identity, task, behaviour, constraints) are stable across every request, while the refusal
policy is the *evidence contract* for this particular grounded flow. Keeping them as separate constants means
a non-grounded flow could reuse `SYSTEM_PROMPT` without inheriting the refusal rules — and it keeps the
cached prefix stable, which chapter 03 §03.9 cares about.

**The note about token budgets.** §07.11 step 2 passes `budgetTokens: RAG_BUDGET` to the retriever. In this
lab the cap is expressed as a **count** (`RAG_TOP_K`) rather than a token budget, which is the simpler
equivalent for a six-chunk knowledge base. In production you would cap both — top-K *and* tokens — because a
single retrieved document can be 20,000 tokens long. That is the same lesson as chapter 03 §03.2's
*"turn-count window vs token-budgeted window"*: a count-based limit is easy to reason about, and a
token-based limit is the production-correct version.

---

## 8.4 Where this file sits in the seven layers

| Layer | Responsibility | File |
| :--- | :--- | :--- |
| 1 · Input validation | limits, unicode, escaping, injection, PII | `guardrail.service.ts` |
| **2 · RAG grounding** | **retrieval + evidence rendering** | **`grounding.service.ts`** |
| 3 · Deterministic tools | read-only enterprise APIs | *not in this lab (Lecture 08)* |
| 4 · Calibrated refusal | the explicit "I don't know" policy | `config/prompts.ts` |
| 5 · Structured outputs | constrained decoding | *not in this lab (Lecture 10)* |
| 6 · Output verification | citation + overlap checks | `guardrail.service.ts` |
| 7 · Observability | metrics, evals, tracing | `session.service.ts` ledger + `GET /api/session/:id` |

> **The point of layer 2.** Layers 1, 6 and 7 *constrain* what the model may say. Layer 2 is the only one
> that gives it something **true to say**. That is why grounding changes the ceiling on reliability rather
> than just the failure rate.

---

## 8.5 Verify

```bash
SID=$(curl -s -X POST http://localhost:8090/api/session -H 'x-user-id: u_101' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.sessionId')

# retrieval returns ids, ranked
curl -s -X POST http://localhost:8090/api/context/preview -H 'x-user-id: u_101' \
  -H 'content-type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"message\":\"Can I order food in Hyderabad?\"}" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.retrievedChunks.map(c=>c.id+":"+c.score).join(", ")'
# kb_delivery_areas:2, kb_tracking:1, ...

# and the answer cites what it used
curl -s -X POST http://localhost:8090/api/chat -H 'x-user-id: u_101' -H 'content-type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"message\":\"Can I order food in Hyderabad?\"}" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")).data;
    JSON.stringify({answer:d.answer, citations:d.citations, ratio:d.verification.ratio})'
```

If you delete `kb_delivery_areas` from the knowledge base and ask again, retrieval finds nothing, the
verifier returns `ok: false`, and the turn becomes a refusal — the full chain from §07.4 through §07.8.

---

### Navigation

- **Previous:** [Chapter 07 — Guardrails & Calibrated Refusal](./07_Guardrails_and_Calibrated_Refusal.md)
- **Next:** [Chapter 09 — Streaming with SSE](./09_Streaming_with_SSE.md)
- **Notes:** [../../notes/07_Engineering_Defences_Grounding_RAG_Guardrails_and_Verification.md](../../../notes/07_Engineering_Defences_Grounding_RAG_Guardrails_and_Verification.md)
