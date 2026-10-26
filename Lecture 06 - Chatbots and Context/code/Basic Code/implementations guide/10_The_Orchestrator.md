# Chapter 10: The Orchestrator — One Message, End to End

> **Chapter goal:** assemble chapters 01–07 into one request path, in the exact order the architecture
> requires — and make the buffered and streamed paths share it so they cannot drift apart.
> **Notes chapters covered:** 08 §08.6 (one message, end to end), §08.2 (the LLM as an unprivileged kernel),
> 07 §07.11 (the grounded engine), 03 §03.4 and §03.7 (compaction off the hot path),
> 02 §02.9 step 4 (telemetry).

---

## 10.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/chat.service.ts` | `prepareTurn` · `previewTurn` · `finaliseTurn` · `runTurn` · `compactIfNeeded` |

---

## 10.2 Commands

```bash
npm run typecheck
```

---

## 10.3 `src/services/chat.service.ts` (full file)

```ts
import { config, CONTEXT_POLICY } from '../config/config.js';
import { COMPACTION_SPEC, REFUSAL_TEXT } from '../config/prompts.js';
import { callModel } from '../lib/llm.js';
import type { AssemblyReport, ChatTurn, Finding, GroundedAnswer, KbChunk, SessionState } from '../types/chat.types.js';
import { assembleContext } from './context.service.js';
import { searchKnowledge } from './grounding.service.js';
import { hasBlocking, sanitizeInput, screenOutput } from './guardrail.service.js';
import { getFactsForUser } from './memory.service.js';
import { appendAssistant, appendCompacted, appendUser, recordLedger, setRunningSummary } from './session.service.js';

/**
 * Chapter 08 §08.6 — the orchestrator: one message, end to end.
 *
 * This file is the only place where chapters 01-07 meet, and the order of the
 * steps IS the architecture. Both the buffered path (`runTurn`) and the streamed
 * path (used by the controller) go through `prepareTurn` and `finaliseTurn`, so
 * they cannot drift apart.
 */

export interface PreparedTurn {
  session: SessionState;
  ok: boolean;
  refusal?: GroundedAnswer;
  messages: ChatTurn[];
  report: AssemblyReport;
  chunks: KbChunk[];
  findings: Finding[];
}

export interface TurnTiming {
  inputTokens: number;
  outputTokens: number;
  ttftMs?: number; // chapter 05 §05.3
  itlMs?: number; // chapter 05 §05.3
}

export interface TurnOutcome extends GroundedAnswer {
  sessionId: string;
  context: AssemblyReport;
  usage: { model: string; inputTokens: number; outputTokens: number; latencyMs: number };
}

/** Chapters 02-04 + 07 — everything the prompt needs, read before assembly. */
const collectContext = (session: SessionState, text: string) => {
  const chunks = searchKnowledge(text, config.RAG_TOP_K); // §07.4 layer 2
  const facts = getFactsForUser(session.userId, config.MEMORY_TOP_K, text); // §04.9
  const report = assembleContext(session, text, facts, chunks); // chapter 03
  return { chunks, facts, report };
};

/**
 * Chapters 07 → 03 → 01, in that order.
 *
 * Layer 1 (input validation) runs FIRST and alone: a blocked message must never
 * reach retrieval, the memory store or the token budget. Nothing is persisted
 * for a blocked turn, because the turn never happened.
 */
export const prepareTurn = (session: SessionState, rawText: string): PreparedTurn => {
  const input = sanitizeInput(rawText, config.MAX_INPUT_CHARS); // §07.3

  if (!input.ok) {
    const { report } = collectContext(session, '');
    const refusal: GroundedAnswer = {
      answer: REFUSAL_TEXT,
      isRefusal: true,
      citations: [],
      verification: { ok: true, checked: 0, ratio: 1, problems: [] },
      findings: input.findings,
    };
    return { session, ok: false, refusal, messages: [], report, chunks: [], findings: input.findings };
  }

  const { chunks, report } = collectContext(session, input.text);

  // Chapter 01 §01.11 — persist the user turn BEFORE the model call, so a crash
  // mid-generation cannot lose a message the user already saw. The assembly above
  // used the *previous* turns, so the current turn is not duplicated.
  appendUser(session.sessionId, input.text);

  return { session, ok: true, messages: report.messages, report, chunks, findings: input.findings };
};

/**
 * Chapters 02 + 03 + 04 — the same assembly, with no model call and no writes.
 * This is the endpoint that lets you study the budget with zero spend.
 */
export const previewTurn = (session: SessionState, rawText: string) => {
  const input = sanitizeInput(rawText, config.MAX_INPUT_CHARS);
  const { chunks, facts, report } = collectContext(session, input.text);
  return { input, facts, chunks, report };
};

/**
 * Chapter 07 §07.8 + chapter 01 §01.6 — verify, then close the loop.
 * Called by BOTH paths, so a streamed answer is verified exactly like a buffered one.
 */
export const finaliseTurn = (prepared: PreparedTurn, raw: string, timing: TurnTiming): GroundedAnswer => {
  const screened = screenOutput(raw, prepared.chunks, config.CITATION_MATCH_THRESHOLD, config.STRICT_VERIFICATION);

  // §07.8 policy — strict mode fails closed: an unverified answer becomes a refusal.
  const blocked = hasBlocking(screened.findings);
  const answer = blocked ? REFUSAL_TEXT : screened.answer;

  appendAssistant(prepared.session.sessionId, answer);

  // Chapter 02 §02.9 step 4 — per-turn telemetry, or every budget debate is an argument.
  recordLedger(prepared.session.sessionId, {
    at: Date.now(),
    inputTokens: timing.inputTokens,
    outputTokens: timing.outputTokens,
    tokensByTier: prepared.report.tokensByTier,
    historyTrimmed: prepared.report.historyTrimmed,
    refused: blocked || screened.isRefusal, // chapter 06 §06.9 — over-refusal is a metric
    ttftMs: timing.ttftMs,
    itlMs: timing.itlMs,
  });

  return {
    answer,
    isRefusal: blocked || screened.isRefusal,
    citations: blocked ? [] : screened.citations,
    verification: screened.verification,
    findings: [...prepared.findings, ...screened.findings],
  };
};

/** Chapter 08 §08.6 — the buffered path: nothing is visible until generation finishes. */
export const runTurn = async (session: SessionState, rawText: string): Promise<TurnOutcome> => {
  const prepared = prepareTurn(session, rawText);

  if (!prepared.ok) {
    return {
      ...prepared.refusal!,
      sessionId: session.sessionId,
      context: prepared.report,
      usage: { model: 'guardrail', inputTokens: 0, outputTokens: 0, latencyMs: 0 },
    };
  }

  const result = await callModel(prepared.messages);

  const grounded = finaliseTurn(prepared, result.text, {
    // Prefer the provider's real usage; fall back to our Tier-1 estimate.
    inputTokens: result.inputTokens || prepared.report.inputTokens,
    outputTokens: result.outputTokens,
  });

  // Chapter 03 §03.7 design rule — if a strategy adds latency, move it off the
  // hot path. Compaction is that strategy: it runs AFTER the user has their answer.
  await compactIfNeeded(session);

  return {
    ...grounded,
    sessionId: session.sessionId,
    context: prepared.report,
    usage: {
      model: result.model,
      inputTokens: result.inputTokens || prepared.report.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    },
  };
};

/**
 * Chapter 03 §03.4 + §03.8 step 1 — rolling summarisation, off the hot path.
 *
 * The raw older turns are replaced by a running summary in the hot store; the
 * durable transcript lives in the cold store (a database, in production).
 * Returns true when a compaction actually happened.
 */
export const compactIfNeeded = async (session: SessionState): Promise<boolean> => {
  const policy = CONTEXT_POLICY;
  if (!policy.summarise) return false;
  if (session.turns.length <= policy.summariseThreshold) return false;

  // The pinned anchor (§03.3) is never compacted: the first K turns carry the goal
  // and the hard constraints, and they are exactly what "I already told you" means.
  const splitAt = Math.max(policy.anchorTurns, session.turns.length - policy.recentTurns);
  const older = session.turns.slice(policy.anchorTurns, splitAt);
  const keep = session.turns.slice(splitAt);
  if (older.length === 0) return false;

  const segment = older.map((turn) => `${turn.role}: ${turn.content}`).join('\n');
  const result = await callModel([
    { role: 'system', content: COMPACTION_SPEC },
    // The existing summary goes in the assistant role: it is the model's own prior
    // output, so it is echoed back as a commitment rather than re-summarised (ch 01 §01.6).
    ...(session.runningSummary ? ([{ role: 'assistant', content: session.runningSummary }] as ChatTurn[]) : []),
    { role: 'user', content: `[SEGMENT]\n${segment}` },
  ]);

  setRunningSummary(session.sessionId, result.text);
  // Remove from the hot path, keep in the record (§03.4): the transcript survives
  // for audit, and semantic recall can still reach it.
  appendCompacted(session.sessionId, older);
  session.turns = [...session.turns.slice(0, policy.anchorTurns), ...keep];
  return true;
};
```

### Block by block

**Why this file exists at all.** Six services already do the work. This one owns the **order**, and the order
*is* the architecture. §08.6's table lists each step next to the failure it prevents; the functions below are
that table, executable.

**`collectContext` — read everything before you assemble anything.**

```ts
const chunks = searchKnowledge(text, config.RAG_TOP_K);                    // §07.4 layer 2
const facts = getFactsForUser(session.userId, config.MEMORY_TOP_K, text);  // §04.9
const report = assembleContext(session, text, facts, chunks);              // chapter 03
```

Three reads, in dependency order, and the *result* is the payload plus its budget report. Notice what is
**not** here: no model call, no writes, no guardrail. Retrieval and memory are pure reads, so this helper is
safe to call from the read-only preview endpoint too.

**`prepareTurn` — layer 1 runs first, and alone.**

```ts
const input = sanitizeInput(rawText, config.MAX_INPUT_CHARS); // §07.3

if (!input.ok) {
  const { report } = collectContext(session, '');
  const refusal: GroundedAnswer = { answer: REFUSAL_TEXT, isRefusal: true, citations: [], … };
  return { session, ok: false, refusal, messages: [], report, chunks: [], findings: input.findings };
}
```

Two decisions are worth dwelling on.

1. **A blocked message never touches retrieval or the budget.** `collectContext(session, '')` is called with
   an empty query precisely so no retrieval happens — the report is only there to keep the response shape
   consistent. Chapter 07 §07.3's whole point is to stop hostile input *before* it becomes context; letting it
   influence the retrieval query would defeat that.
2. **Nothing is persisted for a blocked turn.** The comment states the reason: *the turn never happened.*
   There is no assistant answer to store, and storing the attack would let an attacker write arbitrary text
   into the transcript that a later turn would read back.

**The persist-before-generate rule, finally honoured.**

```ts
// Chapter 01 §01.11 — persist the user turn BEFORE the model call …
appendUser(session.sessionId, input.text);
```

And here is the subtle part that took care in chapter 05: `assembleContext` ran **before** this line, using
the *previous* turns, and pushes the current turn itself as layer 6. So the ordering is both correct and
duplication-free:

| Order | What happens | Why this order |
| :--- | :--- | :--- |
| 1 | `collectContext` → assemble from prior turns + current query | The current turn is layer 6, so it must not also be in history |
| 2 | `appendUser` | The message is durable *before* the model call, so a crash mid-generation loses nothing |

**`previewTurn` — the same assembly, with no side effects.**

```ts
export const previewTurn = (session: SessionState, rawText: string) => {
  const input = sanitizeInput(rawText, config.MAX_INPUT_CHARS);
  const { chunks, facts, report } = collectContext(session, input.text);
  return { input, facts, chunks, report };
};
```

This is what makes chapters 02–04 *studyable*: you can iterate on the `.env` policy and watch the payload
change, without spending a token or writing a row. Note that it still runs the input guardrail — so the
preview shows you exactly what the real path would have sent.

**`finaliseTurn` — verification, persistence and telemetry, in one place.**

```ts
const screened = screenOutput(raw, prepared.chunks, config.CITATION_MATCH_THRESHOLD, config.STRICT_VERIFICATION);
const blocked = hasBlocking(screened.findings);
const answer = blocked ? REFUSAL_TEXT : screened.answer;

appendAssistant(prepared.session.sessionId, answer);
recordLedger(prepared.session.sessionId, { … });
```

Three things are happening, and the order matters:

1. **Verify before persisting.** The transcript must contain what the user *actually receives*, not the raw
   model output. If the verifier flipped the answer to a refusal, the refusal is what gets stored.
2. **`appendAssistant` closes the loop** (ch 01 §01.6). This is the line that makes the *next* request
   coherent — the model will see its own prior commitment.
3. **`recordLedger` writes one row** with the per-tier token counts, the trimming count, the refusal flag and
   the timing. §02.9 step 4's telemetry table, populated on every turn.

The return value is a `GroundedAnswer` — chapter 07 §07.11's shape exactly: `answer`, `isRefusal`,
`citations`, `verification`, `findings`.

**Why the two paths share this function.** `runTurn` (buffered) and the controller's stream handler both call
`finaliseTurn`. That is deliberate: a streamed answer is verified, persisted and logged identically to a
buffered one. Duplicating this logic in the controller is how the two paths drift and one of them silently
stops verifying.

**`runTurn` — the buffered path.**

```ts
const prepared = prepareTurn(session, rawText);
if (!prepared.ok) {
  return { ...prepared.refusal!, sessionId: session.sessionId, context: prepared.report,
           usage: { model: 'guardrail', inputTokens: 0, outputTokens: 0, latencyMs: 0 } };
}
const result = await callModel(prepared.messages);
const grounded = finaliseTurn(prepared, result.text, { inputTokens: result.inputTokens || prepared.report.inputTokens, … });
await compactIfNeeded(session);
```

The `usage.model` value is `'guardrail'` for a blocked turn, which makes it trivial to count blocked requests
in production. And the input-token fallback is honest: the provider reports real usage, but the offline stub
does not, so we fall back to our Tier-1 estimate — labelled as such in the comment.

**`compactIfNeeded` — the only expensive thing, and it runs last.**

```ts
if (session.turns.length <= policy.summariseThreshold) return false;

const splitAt = Math.max(policy.anchorTurns, session.turns.length - policy.recentTurns);
const older = session.turns.slice(policy.anchorTurns, splitAt);
const keep = session.turns.slice(splitAt);
```

This is §03.8 step 1, with one addition the notes' pseudo-code does not spell out. Look at `splitAt`:

```ts
const splitAt = Math.max(policy.anchorTurns, session.turns.length - policy.recentTurns);
```

The `Math.max(policy.anchorTurns, …)` is what makes the anchor *mean* something. Without it, the first
compaction would consume the original opening turns — and the anchor would then pin the first turns of a
*truncated* window, which is not the conversation's beginning at all. §03.3 says the anchor preserves
*"identity, goal, initial problem statement, constraints"*; those only exist at the true start. The one-line
guard is what keeps that claim true after ten compactions.

**The existing summary goes in the `assistant` role, not inside the user message:**

```ts
const result = await callModel([
  { role: 'system', content: COMPACTION_SPEC },
  ...(session.runningSummary ? ([{ role: 'assistant', content: session.runningSummary }] as ChatTurn[]) : []),
  { role: 'user', content: `[SEGMENT]\n${segment}` },
]);
```

This is chapter 01 §01.6 applied to the summariser: the running summary is *the model's own prior output*, so
it is echoed back as a commitment rather than re-summarised as input. Functionally it also stops the
summariser from treating its own previous summary as new material to compress again.

**Compaction removes from the hot path and keeps the record:**

```ts
appendCompacted(session.sessionId, older);
session.turns = [...session.turns.slice(0, policy.anchorTurns), ...keep];
```

Read the second line carefully — the new hot window is **anchor + recent**, with the middle gone. That is
§03.6's layer structure made concrete, and it is why `session.compacted` exists: chapter 05's semantic recall
searches it, so a fact stated in turn 4 is still reachable in turn 40.

**And it runs after the response.** §03.7's design rule: *"if a strategy adds latency, move it off the hot
path. Summarisation is the classic case — compact after responding, never before."* Both call sites honour
this — `runTurn` calls it after building the response, and the stream handler calls it after `[DONE]`.

---

## 10.4 The step table from §08.6, as code

| §08.6 step | Failure it prevents | Where it is in this file |
| :--- | :--- | :--- |
| Input guard | Injection, PII leakage | `prepareTurn` → `sanitizeInput` |
| Load session + profile | Amnesia, lost preferences | `session.service` + `getFactsForUser` |
| Persist user turn | Transcript corruption on crash | `prepareTurn` → `appendUser` |
| Hybrid retrieval | Missing private context, cutoff | `collectContext` → `searchKnowledge` |
| Context assembly | $O(N^2)$ cost, lost-in-the-middle, starvation | `collectContext` → `assembleContext` |
| Constrained decoding | Parsing failures downstream | *not in this lab (Lecture 10)* |
| Citation verification | Coherent fabrication (entity swaps) | `finaliseTurn` → `screenOutput` |
| Persist assistant turn | Lost history, inconsistent transcript | `finaliseTurn` → `appendAssistant` |
| Trace + ledger | Unmeasurable reliability, cost creep | `finaliseTurn` → `recordLedger` |

Only one row is missing, and it is missing on purpose. §08.2's "unprivileged kernel" idea is visible in the
shape of this table: the model is one step out of nine, and every other step is deterministic code that can
overrule it.

---

## 10.5 Verify

```bash
SID=$(curl -s -X POST http://localhost:8090/api/session -H 'x-user-id: u_101' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.sessionId')

curl -s -X POST http://localhost:8090/api/chat -H 'x-user-id: u_101' -H 'content-type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"message\":\"My order 4812 is late\"}" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")).data;
    JSON.stringify({answer:d.answer.slice(0,60), citations:d.citations, verified:d.verification.ok,
                    tiers:d.context.tokensByTier, usage:d.usage}, null, 1)'
```

Then check that the loop was closed — the transcript must contain **both** turns, and the ledger one row:

```bash
curl -s http://localhost:8090/api/session/$SID -H 'x-user-id: u_101' \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")).data;
    JSON.stringify({turns:d.transcript.map(t=>t.role), ledgerRows:d.ledger.length, quality:d.quality}, null, 1)'
```

`turns: ["user","assistant"]` is the proof that the stateless model is now behaving like a conversation.

---

### Navigation

- **Previous:** [Chapter 09 — Streaming with SSE](./09_Streaming_with_SSE.md)
- **Next:** [Chapter 11 — HTTP Layer: Validation & Controllers](./11_HTTP_Layer_Validation_and_Controllers.md)
- **Notes:** [../../notes/08_Complete_Enterprise_Chatbot_Architecture.md](../../../notes/08_Complete_Enterprise_Chatbot_Architecture.md) ·
  [../../notes/07_Engineering_Defences_Grounding_RAG_Guardrails_and_Verification.md](../../../notes/07_Engineering_Defences_Grounding_RAG_Guardrails_and_Verification.md)
