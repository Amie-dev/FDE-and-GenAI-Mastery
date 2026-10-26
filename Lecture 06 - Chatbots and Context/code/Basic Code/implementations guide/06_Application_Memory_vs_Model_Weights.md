# Chapter 06: Application Memory vs Model Weights

> **Chapter goal:** implement "the assistant remembered" correctly — as a durable, typed, auditable and
> **deletable** store that is read per request and injected as context, never as a fine-tune.
> **Notes chapters covered:** 04 §04.2 (parametric vs in-context), §04.5 (training vs inference),
> §04.7 (the application-memory vs fine-tuning decision), §04.8 (GDPR, DSAR, the right to be forgotten),
> §04.9 (the reference implementation).

---

## 6.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/memory.service.ts` | `saveFact` · `getFactsForUser` (top-K by relevance) · `deleteUserMemory` · `exportUserMemory` · `renderFacts` |

---

## 6.2 Commands

```bash
npm run typecheck
```

---

## 6.3 `src/services/memory.service.ts` (full file)

```ts
import { randomUUID } from 'node:crypto';
import type { UserFact } from '../types/chat.types.js';
import { contentWords } from './token.service.js';

/**
 * Chapter 04 — application memory.
 *
 * Prompting does not train the model: the weights are frozen (chapter 04 §04.5).
 * So "the assistant remembered my preference" is always this module — a durable,
 * auditable, *deletable* store that is read per request and injected as context.
 *
 * In production this is PostgreSQL (durable) plus Redis (hot). Here: a Map.
 */

const memory = new Map<string, UserFact[]>();

/** Chapter 04 §04.9 — facts are typed, categorised and carry provenance. */
export const saveFact = (userId: string, fact: Omit<UserFact, 'factId' | 'recordedAt'>): UserFact => {
  const stored: UserFact = { ...fact, factId: randomUUID(), recordedAt: Date.now() };
  memory.set(userId, [...(memory.get(userId) ?? []), stored]);
  return stored;
};

/**
 * Chapter 02 §02.9 tier 1 + chapter 04 §04.9 — top-K facts, never all facts.
 * Facts compete for the token budget, so rank by query overlap and recency,
 * and drop anything whose retention window has expired.
 */
export const getFactsForUser = (userId: string, limit: number, query = ''): UserFact[] => {
  const now = Date.now();
  const terms = contentWords(query);

  return (memory.get(userId) ?? [])
    .filter((fact) => fact.expiresAt === undefined || fact.expiresAt > now)
    .map((fact) => {
      const overlap = terms.filter((term) => fact.content.toLowerCase().includes(term)).length;
      return { fact, score: overlap * 1_000 + fact.recordedAt / 1e9 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.fact);
};

/** Chapter 04 §04.8 — GDPR right to be forgotten. */
export const deleteUserMemory = (userId: string): number => {
  const removed = (memory.get(userId) ?? []).length;
  memory.delete(userId);
  return removed;
};

/** Chapter 04 §04.8 — DSAR: a subject access request needs a machine-readable export. */
export const exportUserMemory = (userId: string): UserFact[] => memory.get(userId) ?? [];

/**
 * Chapter 04 §04.9 step 2 — synthesise the hydrated system block.
 * The last line matters: without it the model narrates its own plumbing
 * ("according to the list I was given...").
 */
export const renderFacts = (facts: UserFact[]): string => {
  const lines = facts.map((fact) => `- (${fact.category}) ${fact.content}`);
  return ['[PERSISTENT USER MEMORY & PREFERENCES]', ...lines, 'Use these facts naturally. Do not mention that you were given a list.'].join('\n');
};
```

### Block by block

**`const memory = new Map<string, UserFact[]>()`** — keyed by `userId`, not by `sessionId`. That is the
whole of chapter 04 in one type signature: a fact belongs to a *person*, so it must survive the end of a
conversation. Session memory (chapter 03) and user memory (chapter 04) are different lifetimes.

**`saveFact` — typed, categorised, with provenance (ch 04 §04.9).**

```ts
export const saveFact = (userId: string, fact: Omit<UserFact, 'factId' | 'recordedAt'>): UserFact => {
  const stored: UserFact = { ...fact, factId: randomUUID(), recordedAt: Date.now() };
  memory.set(userId, [...(memory.get(userId) ?? []), stored]);
  return stored;
};
```

The `Omit<...>` in the signature is doing real work: the *caller* cannot supply a `factId` or a
`recordedAt`, so the store owns identity and time. That is what makes the facts auditable — you can always
trust that `recordedAt` is when the system learned the fact, not when a client claimed to.

Note also what this function does **not** do: it does not call a model. The notes are emphatic (ch 04 §04.5)
that prompting does not train the model. Facts are written by the *application* — from an explicit user
statement, or from an extraction step the application controls.

**`getFactsForUser` — top-K, never all facts (ch 02 §02.9 tier 1, ch 04 §04.9).**

```ts
.filter((fact) => fact.expiresAt === undefined || fact.expiresAt > now)
```

Retention is enforced on **read**, not by a cleanup job. A fact that has expired simply stops appearing, which
means an expiry bug can never leak data — the worst case is a fact that lingers in storage but is never used.

```ts
const overlap = terms.filter((term) => fact.content.toLowerCase().includes(term)).length;
return { fact, score: overlap * 1_000 + fact.recordedAt / 1e9 };
```

Two-part score, and the magnitudes are deliberate. Query overlap dominates (`× 1000`); recency only breaks
ties. Chapter 04 §04.9: *"facts compete for the token budget"* — so the ones you inject must be the most
relevant, and only then the most recent.

`.slice(0, Math.max(0, limit))` is the top-K cut. With `MEMORY_TOP_K=12` in the shipped `.env`, a user with
200 facts still injects at most 12 — because tier 1 has a cap (ch 02 §02.9: *"cap the number of facts
injected, top-K by relevance"*).

**`deleteUserMemory` and `exportUserMemory` — compliance as an API (ch 04 §04.8).**

```ts
export const deleteUserMemory = (userId: string): number => {
  const removed = (memory.get(userId) ?? []).length;
  memory.delete(userId);
  return removed;
};
```

Returning the count is a small but important choice: the caller can tell a user *how much* was deleted, and
an auditor can tell that something *was* deleted. The DSAR counterpart (`exportUserMemory`) returns the raw
records, because a subject access request needs machine-readable data, not a summary.

**Why the notes call this "the feature, not the migration".** §04.8's point is that a system which stores
personal facts in a database can delete them in one statement, while a system that put those facts into
fine-tuned weights **cannot**. Machine unlearning is hard research; `memory.delete(userId)` is a Tuesday
afternoon. The two functions above are that entire argument, in eight lines.

**`renderFacts` — the hydration block (ch 04 §04.9 step 2).**

```ts
return ['[PERSISTENT USER MEMORY & PREFERENCES]', ...lines,
        'Use these facts naturally. Do not mention that you were given a list.'].join('\n');
```

The last line is the one people forget. Without it, the model narrates its own plumbing — *"according to the
list of preferences I was given, you are allergic to peanuts"* — which is both uncanny and a small
information leak. The instruction makes the injected context read as knowledge rather than as a dossier.

---

## 6.4 The decision this file makes for you

| Question | This code's answer | Notes reason |
| :--- | :--- | :--- |
| Where do durable facts live? | A store keyed by `userId` | §04.2 — weights are parametric and frozen; context is fluid |
| How does the model "know" them? | They are rendered into the payload per request | §04.3 — the answer is conditioned on $X$, not stored in $\Theta$ |
| How do you change a fact? | Update one row; the next request sees it | §04.7 — no retraining, no redeploy, immediate effect |
| How do you delete a person's data? | `deleteUserMemory(userId)` | §04.8 — the right to be forgotten |
| When *is* fine-tuning right? | Not here | §04.7 — fine-tuning changes *behaviour and format*, not facts you must be able to edit and delete |

> The test to remember: **if a fact must be updatable, auditable, or deletable, it cannot live in the
> weights.** That single sentence resolves almost every "should we fine-tune?" conversation.

---

## 6.5 Verify

```bash
SID=$(curl -s -X POST http://localhost:8090/api/session -H 'x-user-id: u_101' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.sessionId')

# write a durable fact
curl -s -X POST http://localhost:8090/api/session/$SID/memory -H 'x-user-id: u_101' \
  -H 'content-type: application/json' \
  -d '{"category":"constraint","content":"Customer is allergic to peanuts.","expiresInDays":30}'

# it is now injected as tier 1 on the next request
curl -s -X POST http://localhost:8090/api/context/preview -H 'x-user-id: u_101' \
  -H 'content-type: application/json' -d "{\"sessionId\":\"$SID\",\"message\":\"peanuts allergy\"}" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")).data; JSON.stringify({facts:d.factsInjected.length, memoryTier:d.budget.tokensByTier.memory})'
# {"facts":1,"memoryTier":27}

# DSAR export, then erasure
curl -s http://localhost:8090/api/session/$SID -H 'x-user-id: u_101' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.memory.length'
curl -s -X DELETE http://localhost:8090/api/session/$SID -H 'x-user-id: u_101'
# {"success":true,"data":{"sessionDeleted":true,"factsDeleted":1}}
```

Note that the fact is injected in a **separate** request from the one that created it — which is exactly the
point: the model has no memory, so persistence is the application's job.

---

### Navigation

- **Previous:** [Chapter 05 — Context Management Strategies](./05_Context_Management_Strategies.md)
- **Next:** [Chapter 07 — Guardrails & Calibrated Refusal](./07_Guardrails_and_Calibrated_Refusal.md)
- **Notes:** [../../notes/04_Context_vs_Model_Weights_and_the_Illusion_of_Learning.md](../../../notes/04_Context_vs_Model_Weights_and_the_Illusion_of_Learning.md)
