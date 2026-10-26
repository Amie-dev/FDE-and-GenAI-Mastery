# Chapter 11: HTTP Layer — Validation & Controllers

> **Chapter goal:** expose the domain through a thin HTTP boundary — validate the request shape before any
> token is spent, keep the ownership check on every route, and own the SSE lifecycle in exactly one place.
> **Notes chapters covered:** 07 §07.3 (the request shape is the first guardrail), 05 §05.7 (the six server
> responsibilities), §05.9 (orphaned generation), 01 §01.11 (the capability check), 02 §02.9 step 4
> (telemetry endpoint).

---

## 11.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/middleware/validate.ts` | `requireUserId` · the four Zod request schemas · `validateBody` |
| `src/controllers/chat.controller.ts` | nine thin handlers, including the full SSE stream lifecycle |

---

## 11.2 Commands

```bash
npm run typecheck
```

---

## 11.3 `src/middleware/validate.ts` (full file)

```ts
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/config.js';

/**
 * Chapter 07 §07.3 — the request shape IS the first guardrail.
 * Invalid payloads are rejected with HTTP 400 before any token is spent.
 */

/** Chapter 01 §01.11 — who owns the session. In production this is a JWT claim. */
export const requireUserId = (req: Request): string => {
  const userId = req.header('x-user-id');
  if (!userId) {
    throw Object.assign(new Error('Send an x-user-id header. A session id is a capability; ownership is always checked.'), {
      status: 401,
    });
  }
  return userId;
};

export const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(config.MAX_INPUT_CHARS),
});

export const previewRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(config.MAX_INPUT_CHARS),
});

/** Chapter 04 §04.9 — facts are typed and categorised, with provenance. */
export const memoryRequestSchema = z.object({
  category: z.enum(['preference', 'constraint', 'identity']).default('preference'),
  content: z.string().min(3).max(400),
  source: z.enum(['explicit-user', 'inferred']).default('explicit-user'),
  expiresInDays: z.coerce.number().int().positive().max(3650).optional(),
});

/** Chapter 02 §02.5 — inputs for the O(N^2) projection. */
export const projectionRequestSchema = z.object({
  turns: z.coerce.number().int().min(1).max(500).default(50),
  systemTokens: z.coerce.number().int().positive().default(900),
  expansionPerTurn: z.coerce.number().int().positive().default(220),
  windowTurns: z.coerce.number().int().positive().default(6),
});

/** Chapter 07 §07.3 — one validation layer for every route. */
export const validateBody =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }

    req.body = parsed.data;
    next();
  };
```

### Block by block

**`requireUserId` — the auth stand-in, and why it is not optional.**

```ts
export const requireUserId = (req: Request): string => {
  const userId = req.header('x-user-id');
  if (!userId) {
    throw Object.assign(new Error('Send an x-user-id header. A session id is a capability; ownership is always checked.'), { status: 401 });
  }
  return userId;
};
```

There is no auth server in this lab, so identity comes from a header. But the *shape* of the real thing is
preserved: an unauthenticated request gets 401, and the value returned is what `assertOwnedBy` compares
against. The error message carries the lesson, so a reader who hits it learns why the check exists.

**The schemas — four shapes, one per write endpoint.**

| Schema | Constrains | Notes reason |
| :--- | :--- | :--- |
| `chatRequestSchema` | `sessionId` non-empty, `message` 1…`MAX_INPUT_CHARS` | §07.3's length cap, enforced *before* the handler runs |
| `previewRequestSchema` | the same shape | The read-only twin, so a preview cannot be used to smuggle a larger payload |
| `memoryRequestSchema` | `category` is an enum, `content` ≤ 400 chars, `expiresInDays` ≤ 3650 | §04.9 — facts are *typed*; a free-text category cannot be ranked or deleted selectively |
| `projectionRequestSchema` | `turns` ≤ 500 | Chapter 02 §02.5's projection allocates a row per turn, so the bound protects the process |

Two details are worth copying.

**The enums, not strings.** `z.enum(['preference', 'constraint', 'identity'])` means an invalid category is
rejected at the boundary. That is what makes the `category` field useful later — for ranking, for retention
policy, and for targeted deletion (ch 04 §04.8).

**The upper bounds are all present.** `max(400)`, `max(3650)`, `max(500)` — every schema caps its inputs. A
Zod schema without an upper bound is a denial-of-service vector, because an unbounded string is an unbounded
token bill.

**`validateBody` — one validation layer for every route.**

```ts
const parsed = schema.safeParse(req.body ?? {});
if (!parsed.success) {
  res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  return;
}
req.body = parsed.data;
next();
```

Three things are happening:

1. **`req.body ?? {}`** — a POST with no body at all must produce a field-error list, not a crash. This is
   the difference between a helpful 400 and a 500.
2. **`parsed.data`, not `req.body`** — the parsed result is written *back*, so downstream code sees defaults
   applied and unknown keys stripped. This is what lets the controller destructure with confidence.
3. **`parsed.error.flatten().fieldErrors`** — the client gets `{"message": ["Required"]}` rather than a
   stack trace. A validation failure is a user error, and it should read like one.

---

## 11.4 `src/controllers/chat.controller.ts` (full file)

```ts
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { config, CONTEXT_POLICY } from '../config/config.js';
import { openSseStream, sendDone, sendError, sendEvent } from '../lib/sse.js';
import { isOffline, streamModel } from '../lib/llm.js';
import {
  compactIfNeeded,
  finaliseTurn,
  prepareTurn,
  previewTurn,
  runTurn,
} from '../services/chat.service.js';
import { deleteUserMemory, exportUserMemory, saveFact } from '../services/memory.service.js';
import {
  assertOwnedBy,
  createSession,
  deleteSession,
  listSessions,
  loadSession,
  summariseSession,
} from '../services/session.service.js';
import { estimateTokens, projectAccumulation } from '../services/token.service.js';
import { requireUserId } from '../middleware/validate.js';

/**
 * Chapter 01 §01.7 — controllers stay thin.
 * No prompt text, no token maths, no provider details: those live in `services/`.
 */

/** Chapter 08 §08.5 — what the process is wired to, and which policy is live. */
export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'UP',
    mode: isOffline() ? 'OFFLINE (no provider key — deterministic stub)' : 'LIVE',
    provider: config.AI_PROVIDER,
    model: config.AI_MODEL,
    endpoint: config.AI_ENDPOINT,
    temperature: config.AI_TEMPERATURE,
    contextWindow: config.CONTEXT_WINDOW_TOKENS,
    outputReserve: config.AI_MAX_TOKENS,
    inputBudget: config.INPUT_BUDGET,
    contextPolicy: CONTEXT_POLICY,
    guardrails: {
      maxInputChars: config.MAX_INPUT_CHARS,
      citationMatchThreshold: config.CITATION_MATCH_THRESHOLD,
      strictVerification: config.STRICT_VERIFICATION,
    },
    sessions: listSessions().length,
    uptimeSeconds: Math.floor(process.uptime()),
  });
};

/** Chapter 01 §01.2 — the model has no memory, so the application must open one. */
export const postSession = (req: Request, res: Response): void => {
  const userId = requireUserId(req);
  const session = createSession(userId);
  res.status(201).json({ success: true, data: { sessionId: session.sessionId, userId } });
};

/**
 * Chapter 01 §01.11 — never read a session without proving ownership.
 * Chapter 02 §02.6 — the same history, in three currencies: turns, tokens, money-shape.
 * Chapter 06 §06.9 — refusal rate is tracked like an error rate.
 */
export const getSession = (req: Request, res: Response): void => {
  const userId = requireUserId(req);
  const session = loadSession(String(req.params.sessionId ?? ''));

  if (!session) {
    res.status(404).json({ error: 'Not Found', message: 'No such session.' });
    return;
  }
  assertOwnedBy(session, userId);

  const ledger = session.ledger;
  const rate = (count: number): number => (ledger.length ? Number((count / ledger.length).toFixed(2)) : 0);
  const last = ledger[ledger.length - 1];

  res.status(200).json({
    success: true,
    data: {
      ...summariseSession(session),
      memory: exportUserMemory(userId),
      cost: {
        cumulativeInputTokens: ledger.reduce((total, row) => total + row.inputTokens, 0),
        cumulativeOutputTokens: ledger.reduce((total, row) => total + row.outputTokens, 0),
        peakInputTokens: ledger.reduce((peak, row) => Math.max(peak, row.inputTokens), 0),
      },
      quality: {
        refusalRate: rate(ledger.filter((row) => row.refused).length),
        turnsWithTrimming: rate(ledger.filter((row) => row.historyTrimmed > 0).length),
        lastTtftMs: last?.ttftMs,
        lastItlMs: last?.itlMs,
      },
      note: 'Older turns are compacted into runningSummary once the policy threshold is passed (chapter 03 §03.4).',
    },
  });
};

/** Chapter 04 §04.8 — the right to be forgotten is an API, not a migration. */
export const removeSession = (req: Request, res: Response): void => {
  const userId = requireUserId(req);
  const session = loadSession(String(req.params.sessionId ?? ''));

  if (!session) {
    res.status(404).json({ error: 'Not Found', message: 'No such session.' });
    return;
  }
  assertOwnedBy(session, userId);

  deleteSession(session.sessionId);
  const deletedFacts = deleteUserMemory(userId);
  res.status(200).json({ success: true, data: { sessionDeleted: true, factsDeleted: deletedFacts } });
};

/** Chapter 04 §04.9 — durable facts are written by the application, never by the model. */
export const postMemory = (req: Request, res: Response): void => {
  const userId = requireUserId(req);
  const session = loadSession(String(req.params.sessionId ?? ''));

  if (!session) {
    res.status(404).json({ error: 'Not Found', message: 'No such session.' });
    return;
  }
  assertOwnedBy(session, userId);

  const { category, content, source, expiresInDays } = req.body as {
    category: 'preference' | 'constraint' | 'identity';
    content: string;
    source: 'explicit-user' | 'inferred';
    expiresInDays?: number;
  };

  const fact = saveFact(userId, {
    category,
    content,
    source,
    expiresAt: expiresInDays ? Date.now() + expiresInDays * 86_400_000 : undefined,
  });

  res.status(201).json({ success: true, data: fact });
};

/**
 * Chapters 02 + 03 + 04 + 07 — inspect the assembled payload and its budget.
 * No model call, no writes: this is how you study the context window for free.
 */
export const postPreview = (req: Request, res: Response): void => {
  const userId = requireUserId(req);
  const { sessionId, message } = req.body as { sessionId: string; message: string };
  const session = loadSession(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Not Found', message: 'No such session.' });
    return;
  }
  assertOwnedBy(session, userId);

  const preview = previewTurn(session, message);
  res.status(200).json({
    success: true,
    data: {
      input: preview.input,
      retrievedChunks: preview.chunks,
      factsInjected: preview.facts,
      budget: {
        ...preview.report,
        // Tier 2 — the exact encoder, run once on the final payload (§02.4).
        exactInputTokens: preview.report.messages.reduce((total, turn) => total + estimateTokens(turn.content), 0),
      },
    },
  });
};

/** Chapter 02 §02.5 — see the O(N^2) growth of naive history appending for yourself. */
export const postProjection = (req: Request, res: Response): void => {
  const { turns, systemTokens, expansionPerTurn, windowTurns } = req.body as {
    turns: number;
    systemTokens: number;
    expansionPerTurn: number;
    windowTurns: number;
  };

  const rows = projectAccumulation({ turns, systemTokens, expansionPerTurn, windowTurns, inputBudget: config.INPUT_BUDGET });
  const last = rows[rows.length - 1]!;

  res.status(200).json({
    success: true,
    data: {
      rows,
      summary: {
        naiveCumulativeTokens: last.naiveCumulativeTokens,
        managedCumulativeTokens: last.managedCumulativeTokens,
        // The multiplier is the whole point of chapter 02 §02.5.
        naiveOverManaged: Number((last.naiveCumulativeTokens / Math.max(1, last.managedCumulativeTokens)).toFixed(2)),
      },
    },
  });
};

/** Chapter 08 §08.6 — the buffered path. Everything is verified before it is returned. */
export const postChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const { sessionId, message } = req.body as { sessionId: string; message: string };
    const session = loadSession(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Not Found', message: 'No such session.' });
      return;
    }
    assertOwnedBy(session, userId);

    res.status(200).json({ success: true, data: await runTurn(session, message) });
  } catch (error) {
    next(error);
  }
};

/**
 * Chapter 05 §05.7 — the streamed path. Six responsibilities, in order:
 * validate → set headers → wire cancellation → stream → terminate → persist.
 */
export const postChatStream = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const { sessionId, message } = req.body as { sessionId: string; message: string };

    // Everything that can fail with a status code must fail BEFORE the stream
    // opens: once writeHead(200) has run, a 4xx is no longer possible.
    const session = loadSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Not Found', message: 'No such session.' });
      return;
    }
    assertOwnedBy(session, userId);

    const prepared = prepareTurn(session, message);
    const startedAt = Date.now();

    // §05.5 — headers before the first write.
    openSseStream(res);

    if (!prepared.ok) {
      // A blocked input is still a valid stream: the client should render the refusal.
      sendEvent(res, 'guardrail', { findings: prepared.refusal!.findings });
      sendEvent(res, 'refusal', { answer: prepared.refusal!.answer });
      sendDone(res);
      return;
    }

    sendEvent(res, 'start', { messageId: randomUUID(), model: config.AI_MODEL, tokensByTier: prepared.report.tokensByTier });

    // §05.9 — no orphaned generation: when the client leaves, stop paying for tokens.
    // We listen on the *response*, because on a POST the request stream has already
    // finished by the time this handler runs, so `req.on('close')` fires immediately.
    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) abort.abort();
    });

    let full = '';
    let deltas = 0;
    let firstAt = 0;
    let previousAt = 0;
    let gapTotal = 0;

    try {
      for await (const delta of streamModel(prepared.messages, abort.signal)) {
        const now = Date.now();
        if (firstAt === 0) firstAt = now;
        else gapTotal += now - previousAt;
        previousAt = now;

        full += delta;
        deltas += 1;
        sendEvent(res, 'token', { delta });
      }
    } catch (error) {
      if (abort.signal.aborted) return; // the client left; nothing to report
      sendError(res, 'generation_failed', (error as Error).message);
      return;
    }

    // Chapter 05 §05.3 — TTFT is what the user perceives; ITL is the typing speed.
    const ttftMs = firstAt === 0 ? undefined : firstAt - startedAt;
    const itlMs = deltas > 1 ? Math.round(gapTotal / (deltas - 1)) : undefined;

    const grounded = finaliseTurn(prepared, full, {
      inputTokens: prepared.report.inputTokens,
      outputTokens: estimateTokens(full),
      ttftMs,
      itlMs,
    });

    if (grounded.citations.length > 0) sendEvent(res, 'citation', { ids: grounded.citations });

    // Streaming variant of the §07.8 fail-closed policy: the tokens are already on
    // the wire, so the client is told to *replace* what it rendered.
    //
    // §05.9 hazard, deliberately left visible here: the machine-readable `CITATIONS:`
    // line is streamed like any other token, then stripped before persistence. A
    // production system suppresses it (buffer a small tail, or return citations as
    // structured output — Lecture 10). The `citation` event above is the authoritative signal.
    const streamedAnswer = full.replace(/^[ \t]*CITATIONS?[ \t]*:.*$/im, '').trim();
    if (streamedAnswer !== grounded.answer) {
      sendEvent(res, 'guardrail', { action: 'replace', findings: grounded.findings, answer: grounded.answer });
    }

    sendEvent(res, 'done', { finishReason: 'stop', totalTokens: estimateTokens(full), ttftMs, itlMs, isRefusal: grounded.isRefusal });
    sendDone(res);

    // §05.7 step 7 — the assistant turn only exists now, so compaction is after the stream.
    await compactIfNeeded(session);
  } catch (error) {
    next(error);
  }
};
```

### Block by block — the read endpoints

**`getHealth`** — the observability endpoint from chapter 08 §08.5. It reports the wiring (`provider`,
`model`, `endpoint`), the **derived** budget (`inputBudget`), the live `contextPolicy`, the guardrail
thresholds and the current `mode`. When something behaves unexpectedly, this is the first request to make —
it tells you whether the process is running the configuration you think it is.

**`postSession`** — creates the memory the model lacks (ch 01 §01.2). Note the `201` status: a session was
*created*, so `201` is correct and `200` would be sloppy.

**`getSession`** — the three-currencies view from chapter 02 §02.6 plus the quality metrics:

```ts
cost:    { cumulativeInputTokens, cumulativeOutputTokens, peakInputTokens },
quality: { refusalRate, turnsWithTrimming, lastTtftMs, lastItlMs },
```

Every number here comes from the ledger that `finaliseTurn` writes. This is what §02.9 step 4 means by
*"instrument the budget, don't guess it"*: the endpoint exists so a budget conversation can be had with data.
`refusalRate` is chapter 06 §06.9's over-refusal metric — tracked exactly like an error rate.

The `note` field is not decoration. It explains that older turns have moved into `runningSummary`, so a
reader who sees `turnCount: 8` alongside `compactedTurnCount: 16` understands why the transcript is shorter
than the conversation.

**`removeSession`** — chapter 04 §04.8, both halves in one call:

```ts
deleteSession(session.sessionId);
const deletedFacts = deleteUserMemory(userId);
```

Deleting the conversation and deleting the person's durable facts are different operations, and doing both
here makes the distinction visible. A real system might separate them; the lab keeps them together so the
"right to be forgotten" is one observable action.

**`postMemory`** — writes a durable fact. The `expiresAt` arithmetic is the only line worth noting:

```ts
expiresAt: expiresInDays ? Date.now() + expiresInDays * 86_400_000 : undefined,
```

Retention is expressed in days at the API and stored as an absolute timestamp, so the expiry check in
`memory.service.ts` is a single comparison with no clock drift.

**`postPreview`** — the study endpoint. It returns the sanitized input, the retrieved chunks, the facts that
would be injected, and the full budget report:

```ts
budget: {
  ...preview.report,
  exactInputTokens: preview.report.messages.reduce((total, turn) => total + estimateTokens(turn.content), 0),
},
```

`exactInputTokens` is the **Tier-2** measurement from chapter 02 §02.4, run once on the final payload — and
comparing it to `report.inputTokens` (the Tier-1 estimate) is the best possible demonstration of the two-tier
design: the estimate is close, slightly high, and free.

**`postProjection`** — chapter 02 §02.5 as an endpoint. It returns every row plus a one-line summary:

```ts
naiveOverManaged: Number((last.naiveCumulativeTokens / Math.max(1, last.managedCumulativeTokens)).toFixed(2)),
```

The `Math.max(1, …)` guard exists so the endpoint cannot produce `Infinity` or `NaN` for degenerate inputs.
Small defensive details like this are what keep an API usable.

**`postChat`** — the buffered path, and the thinnest handler in the file:

```ts
res.status(200).json({ success: true, data: await runTurn(session, message) });
```

Everything — guardrails, retrieval, assembly, generation, verification, persistence, compaction — happens
inside `runTurn`. Chapter 01 §01.7's rule: *controllers stay thin.* If you ever find yourself writing token
arithmetic in a controller, the logic belongs in a service.

---

### Block by block — the streamed endpoint

`postChatStream` is the longest handler in the codebase, and it is long for one reason: §05.7 gives it **six
responsibilities in a specific order**, and every one of them has a failure mode if it moves.

**1 · Validate before the stream opens.**

```ts
const session = loadSession(sessionId);
if (!session) { res.status(404).json({ … }); return; }
assertOwnedBy(session, userId);

const prepared = prepareTurn(session, message);
const startedAt = Date.now();

openSseStream(res);
```

Everything that can fail with a status code fails **before** `openSseStream`. §05.7: *"once you write, the
status is committed. You cannot send a 500 later."* This ordering is why the 404 and 403 paths still work on a
streaming endpoint.

**2 · A blocked input is still a valid stream.**

```ts
if (!prepared.ok) {
  sendEvent(res, 'guardrail', { findings: prepared.refusal!.findings });
  sendEvent(res, 'refusal', { answer: prepared.refusal!.answer });
  sendDone(res);
  return;
}
```

Note it does **not** return an HTTP error. The stream is already open with a 200, and the client is expecting
SSE — so the refusal is delivered as typed events. A client that only handles JSON would break here, which is
exactly why the event protocol has to be designed deliberately (chapter 09 §9.3).

**3 · Cancellation, wired to the right event.**

```ts
const abort = new AbortController();
res.on('close', () => {
  if (!res.writableEnded) abort.abort();
});
```

§05.9's *orphaned generation* defence — *"paying for tokens nobody will read."* Two details differ from the
notes' pseudo-code, and both matter:

| Detail | Why |
| :--- | :--- |
| Listening on **`res`**, not `req` | On a POST, `express.json()` has already consumed the body, so `req` is finished and `req.on('close')` can fire immediately — aborting every stream |
| Guarding on **`!res.writableEnded`** | `res`'s `close` event also fires *after* a normal `res.end()`. Without the guard, every successful response would look like a disconnect |

**4 · The pump, and the two timing numbers.**

```ts
for await (const delta of streamModel(prepared.messages, abort.signal)) {
  const now = Date.now();
  if (firstAt === 0) firstAt = now; else gapTotal += now - previousAt;
  previousAt = now;

  full += delta;
  deltas += 1;
  sendEvent(res, 'token', { delta });
}
```

Three accumulators, all of them necessary:

- `full` — the complete text, needed for verification and persistence
- `firstAt` — the first token's timestamp, which gives TTFT (§05.3)
- `gapTotal` / `previousAt` — the sum of inter-token gaps, which gives ITL

```ts
const ttftMs = firstAt === 0 ? undefined : firstAt - startedAt;
const itlMs = deltas > 1 ? Math.round(gapTotal / (deltas - 1)) : undefined;
```

`firstAt === 0` means *no tokens arrived at all* — an empty or fully-aborted generation. Reporting `undefined`
is honest; reporting `0` would look like an impossibly fast first token and corrupt any latency dashboard.

**5 · The error path knows the difference between a failure and a departure.**

```ts
} catch (error) {
  if (abort.signal.aborted) return; // the client left; nothing to report
  sendError(res, 'generation_failed', (error as Error).message);
  return;
}
```

If the user pressed Stop, the "error" is the abort we requested. Logging or reporting it would produce noise
in your error rate for every cancelled request — one of the most common false alarms in streaming systems.

**6 · Verification happens after the last token, and the client is told if it changed anything.**

```ts
const grounded = finaliseTurn(prepared, full, {
  inputTokens: prepared.report.inputTokens, outputTokens: estimateTokens(full), ttftMs, itlMs,
});

if (grounded.citations.length > 0) sendEvent(res, 'citation', { ids: grounded.citations });

const streamedAnswer = full.replace(/^[ \t]*CITATIONS?[ \t]*:.*$/im, '').trim();
if (streamedAnswer !== grounded.answer) {
  sendEvent(res, 'guardrail', { action: 'replace', findings: grounded.findings, answer: grounded.answer });
}
```

This is the honest resolution of a real conflict. §07.8 says *fail closed* — an unverified answer must become
a refusal. But by the time the verifier runs, the tokens are already on the wire. So the protocol carries a
`guardrail` event with `action: "replace"`: the client discards what it rendered and shows the verified
answer instead.

**The known limitation, stated in the code.** The `CITATIONS:` line is streamed like any other token and only
stripped before persistence. The comment says so, and names the two production fixes: buffer a small tail, or
return citations as structured output (Lecture 10). Leaving a visible seam with an explanation is more useful
than hiding it.

**7 · Terminate, then persist, then compact.**

```ts
sendEvent(res, 'done', { finishReason: 'stop', totalTokens: estimateTokens(full), ttftMs, itlMs, isRefusal: grounded.isRefusal });
sendDone(res);

await compactIfNeeded(session);
```

The order is the notes' order (§05.7 steps 6–7): the assistant turn only exists once generation finishes, so
persistence (inside `finaliseTurn`) and compaction come after the stream closes. §03.7's rule again —
summarisation never delays a user's answer.

---

## 11.5 Verify

```bash
# validation is the first guardrail: an empty body is a 400, not a crash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8090/api/chat \
  -H 'x-user-id: u_101' -H 'content-type: application/json' -d '{}'
# 400

# an empty message is rejected before any token is spent
curl -s -X POST http://localhost:8090/api/chat -H 'x-user-id: u_101' -H 'content-type: application/json' \
  -d '{"sessionId":"x","message":""}'
# {"error":"Validation failed","details":{"message":["String must contain at least 1 character(s)"]}}

# a stream that is cancelled mid-flight must not appear as an error
curl -s -N -X POST http://localhost:8090/api/chat/stream -H 'x-user-id: u_101' \
  -H 'content-type: application/json' \
  -d '{"sessionId":"<id>","message":"Can I order food in Hyderabad?"}' | head -4
# (then Ctrl-C / pipe closes) → the server logs nothing, because abort.signal.aborted is true
```

---

### Navigation

- **Previous:** [Chapter 10 — The Orchestrator: One Message, End to End](./10_The_Orchestrator.md)
- **Next:** [Chapter 12 — Routes, App & Server](./12_Routes_App_and_Server.md)
- **Notes:** [../../notes/05_Real_Time_Streaming_and_SSE.md](../../../notes/05_Real_Time_Streaming_and_SSE.md) ·
  [../../notes/07_Engineering_Defences_Grounding_RAG_Guardrails_and_Verification.md](../../../notes/07_Engineering_Defences_Grounding_RAG_Guardrails_and_Verification.md)
