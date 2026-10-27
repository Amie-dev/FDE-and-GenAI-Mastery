# Chapter 06: The API Surface

> **Chapter goal:** see how a *typed outcome* becomes an HTTP status, and why the HTTP layer is deliberately the
> thinnest file in the project.
> **Notes chapters covered:** 06 §06.1.1 (the boundary in a service), 06 §06.10 (outcomes, not exceptions) ·
> 07 §07.9 (the request body is untrusted input too) · 05 §05.4.3, §05.7 (the silent limits and the rung) ·
> 09 §09.2, §09.6 (metrics and traces).

---

## 6.1 `src/controllers/extraction.controller.ts` (full file)

```ts
import { Request, Response } from 'express';
import { ENFORCEMENT_LADDER, SEMANTIC_POLICY, config } from '../config/config.js';
import { enforcementReason, isOffline, chooseEnforcement } from '../lib/llm.js';
import {
  MEETING_JSON_SCHEMA,
  MEETING_TYPES,
  NO_UNIONS_REASON,
  SCHEMA_VERSION,
  SILENT_LIMITS,
} from '../schema/meeting.schema.js';
import { costEstimate, extract, flaggedCount, metrics, recentTraces } from '../services/extraction.service.js';
import type { ExtractBody } from '../middleware/validate.js';

/**
 * Chapter 06 §06.1.1 — the controller owns the HTTP lifecycle and NOTHING else.
 *
 * Notice how thin it is. It parses, calls the service, and maps a TYPED OUTCOME
 * to a status code. Its whole contribution to "intelligence" is one line:
 * `await extract(...)`.
 *
 * The one interesting decision is here, and it is a *product* decision: how does
 * each outcome map to an HTTP status?
 */

/** Chapter 06 §06.10 — the outcome-to-status mapping, in one readable table. */
const STATUS_FOR: Record<string, number> = {
  ok: 200,
  repaired: 200, // usable — the repair is reported in the body, not as an error
  degraded: 206, // Partial Content: a valid object with explicit unknowns
  refused: 422, // the model declined; do not retry
  truncated: 502, // the provider cut the output; raise the budget
  invalid: 502, // exhausted repairs; the object never became usable
};

export const getHealth = (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    mode: isOffline() ? 'offline (deterministic stub model)' : 'live provider',
    model: config.AI_MODEL,
    provider: config.AI_PROVIDER,
    temperature: config.AI_TEMPERATURE,
    /** Chapter 05 §05.7 — which rung of the ladder this process is on, and why. */
    enforcement: { active: chooseEnforcement(), ladder: ENFORCEMENT_LADDER, reason: enforcementReason() },
    /** Chapter 04 §04.12.12 — the contract's version, on every response. */
    schemaVersion: SCHEMA_VERSION,
    /** Chapter 05 §05.4.3 — what the decoder does NOT enforce. */
    silentLimits: SILENT_LIMITS,
    semanticPolicy: SEMANTIC_POLICY,
    loop: { maxRepairs: config.MAX_REPAIRS, maxTokens: config.MAX_TOKENS },
    endpoints: ['GET /api/health', 'GET /api/schema', 'POST /api/extract', 'GET /api/metrics'],
  });
};

/**
 * Chapter 02 §02.6 — THE THREE ARTEFACTS, made visible.
 *
 * Artefact 3 (the wire contract) is shown here. Artefact 1 (the type) and
 * artefact 2 (the validator) are not JSON — they exist at compile time and at
 * the boundary — but all three come from the same declaration.
 */
export const getSchema = (_req: Request, res: Response): void => {
  res.json({
    schemaVersion: SCHEMA_VERSION,
    artefacts: {
      1: 'TypeScript type  -> z.infer<typeof MeetingSchema> (compile time)',
      2: 'Runtime validator -> MeetingSchema.safeParse (the boundary)',
      3: 'Wire contract     -> MEETING_JSON_SCHEMA (this document)',
    },
    closedSet: MEETING_TYPES,
    /** §04.12.10 — the union rule, and why. */
    unions: { used: false, reason: NO_UNIONS_REASON },
    silentLimits: SILENT_LIMITS,
    jsonSchema: MEETING_JSON_SCHEMA,
  });
};

/**
 * Chapter 06 §06.2 — the whole reliability loop, behind one endpoint.
 *
 * Every branch of the ladder is reachable from here, which is what makes the
 * system testable rather than hoped-for.
 */
export const postExtract = async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body as ExtractBody;
  const outcome = await extract(text);

  const status = STATUS_FOR[outcome.kind] ?? 500;

  // Chapter 09 §09.6 — the response carries the trace, so the caller can see
  // WHICH attempt produced the object and WHAT failed before it.
  res.status(status).json({
    outcome: outcome.kind,
    attempts: outcome.attempts,
    value: 'value' in outcome ? outcome.value : undefined,
    reason: 'reason' in outcome ? outcome.reason : undefined,
    issues: 'issues' in outcome ? outcome.issues : undefined,
    enforcement: 'enforcement' in outcome ? outcome.enforcement : undefined,
    trace: recentTraces()[0],
  });
};

/** Chapter 09 §09.2 — the metrics table the lecture's gate asks for. */
export const getMetrics = (_req: Request, res: Response): void => {
  res.json({
    metrics: metrics(),
    cost: costEstimate(),
    flaggedTraces: flaggedCount(),
    note: 'Every rate is dimensioned by enforcement, because without it you cannot tell a regression from a rollout.',
  });
};
```

### Block by block — the controller

**Block 1 — `STATUS_FOR`.** The whole chapter in six lines. Read it as a table of *product* decisions:

| Outcome | Status | Why this status and not another |
| :--- | :--- | :--- |
| `ok` | `200` | The happy path |
| `repaired` | `200` | The object is **usable**. The repair is reported in the body, not as an error — a repaired extraction is a success with a footnote |
| `degraded` | `206` | *Partial Content* is precisely right: valid shape, explicit unknowns |
| `refused` | `422` | *Unprocessable Content*: the model understood the request and declined |
| `truncated` | `502` | The **upstream** provider produced an unusable response. Not the client's fault, not your bug |
| `invalid` | `502` | Same class: the upstream never produced something usable |

> **The decision that matters most is `repaired → 200`.** Teams often want `repaired` to be a `202` or a `500` because
> it "felt like a failure". It is not: chapter 06 §06.7 exists *precisely* so that a slip does not become a
> user-visible error. If a repair returns an error status, you have built the retry loop and then thrown away its
> benefit.

**Block 2 — `getHealth`.** Not a liveness probe — an **architecture report**. It answers the five questions from
chapter 05 §05.5.1 in one request:

```json
{
  "mode": "offline (deterministic stub model)",
  "enforcement": { "active": "native_schema", "ladder": ["native_schema","json_mode","instruction"],
                   "reason": "Offline stub emulates native schema enforcement (chapter 05 §05.7)." },
  "silentLimits": ["minimum / maximum      -> validated by Zod, not by the decoder", "…"],
  "semanticPolicy": { "maxDurationMinutes": 240, "maxDurationDays": 30, "reviewDurationMinutes": 240 },
  "loop": { "maxRepairs": 2, "maxTokens": 700 }
}
```

The `reason` field is the interesting one: the process explains *why* it chose its rung, so a learner — or an
on-call engineer — never has to guess whether the schema is actually being enforced.

**Block 3 — `getSchema`.** Artefact 3, exposed. Note the `artefacts` object: it names all three, including the two
that are not JSON, so the reader understands the JSON document is only one third of the contract.

`unions: { used: false, reason: … }` is a nice touch: it states a *design decision* at runtime, so "why is there no
`oneOf` here?" has an answer that lives with the code (chapter 04 §04.12.1).

**Block 4 — `postExtract`.** The whole pipeline, three lines of logic:

```ts
const { text } = req.body as ExtractBody;
const outcome = await extract(text);
const status = STATUS_FOR[outcome.kind] ?? 500;
```

Then the response. And here is the part worth studying — the **conditional field spreading**:

```ts
value:       'value' in outcome ? outcome.value : undefined,
reason:      'reason' in outcome ? outcome.reason : undefined,
issues:      'issues' in outcome ? outcome.issues : undefined,
enforcement: 'enforcement' in outcome ? outcome.enforcement : undefined,
```

Each `in` check narrows the union. TypeScript will not let you read `outcome.value` before proving the outcome is one
that *has* a `value` — the compiler enforcing the same discipline the `Outcome<T>` type was designed for (chapter 06
§06.10). `refused` and `truncated` genuinely have no `value`, so the response omits it rather than sending a
misleading `null`.

**Block 5 — `trace: recentTraces()[0]`.** Every extraction response carries the trace of its *final* attempt. That is
what makes the failure path observable from the outside:

```json
"trace": { "attempt": 2, "outcome": "repaired", "enforcement": "native_schema",
           "issues": [{ "path": "durationMinutes", "type": "invalid_type" },
                      { "path": "type", "type": "invalid_enum_value" }],
           "inputTokens": 316, "outputTokens": 70, "latencyMs": 0, "semanticFlags": [] }
```

Note `attempt: 2` — the caller can see that a repair happened, what failed on attempt 1, and what it cost. Chapter
09 §09.6 in one object.

**Block 6 — `getMetrics`.** Thin, because all the work is in the service. The `note` field is deliberate
documentation-in-the-response: it tells the reader *why* `byEnforcement` exists.

---

## 6.2 `src/middleware/validate.ts` (full file)

```ts
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/config.js';

/**
 * Chapter 02 §02.7.1 / chapter 07 §07.9 — validate BEFORE anything executes.
 *
 * The request body is untrusted input in exactly the same way the model's output
 * is. Both cross a boundary, so both get the same treatment: one schema, one
 * `safeParse`, machine-readable issues on failure.
 */

/** Chapter 09 §09.6 — bound the input, because unbounded input is unbounded cost. */
export const extractBodySchema = z
  .object({
    text: z.string().min(1).max(config.MAX_INPUT_CHARS),
    /** Chapter 06 §06.7.1 — a per-request repair cap, bounded by the configured maximum. */
    maxRepairs: z.coerce.number().int().min(0).max(config.MAX_REPAIRS).optional(),
  })
  .strict();

export type ExtractBody = z.infer<typeof extractBodySchema>;

/** One validation layer for every route. */
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

### Block by block — the middleware

**Block 1 — the same discipline, applied in the other direction.** This file is the mirror image of
`schema/meeting.schema.ts`. Chapter 07 §07.9 makes the point: *tool arguments are untrusted input* — and so is the
request body. Both cross a boundary, so both get one schema and one `safeParse`.

**Block 2 — `extractBodySchema`.** Three choices, each deliberate:

| Choice | Why |
| :--- | :--- |
| `.strict()` | An unexpected key is a client bug, not something to ignore silently — the same closure rule as the output schema (§04.12.6) |
| `.max(config.MAX_INPUT_CHARS)` | Unbounded input is unbounded cost, and a cost attack is still an attack (chapter 09 §09.5) |
| `maxRepairs` bounded by `config.MAX_REPAIRS` | A client may **lower** the repair budget for a latency-sensitive call, but never raise it above the operator's ceiling (chapter 06 §06.7.1) |

That last row is a small but real piece of API design: it gives callers a latency lever without giving them a way to
create a cost incident.

**Block 3 — `validateBody`.** A curried middleware, and the three lines that matter:

```ts
const parsed = schema.safeParse(req.body ?? {});
if (!parsed.success) { res.status(400).json({ … }); return; }
req.body = parsed.data;   // <- the controller sees only validated data
next();
```

`req.body = parsed.data` is the important line: after this, the handler works with *coerced, validated* data —
`maxRepairs` is already a number, not a string. This is the extraction boundary's pattern, applied at the HTTP
boundary. That consistency is the point the notes are arguing for.

---

## 6.3 `src/routes/index.ts` (full file)

```ts
import { Router } from 'express';
import { getHealth, getMetrics, getSchema, postExtract } from '../controllers/extraction.controller.js';
import { extractBodySchema, validateBody } from '../middleware/validate.js';

export const router = Router();

/** Chapter 05 §05.7 — which enforcement rung this process is on, and why. */
router.get('/health', getHealth);

/** Chapter 02 §02.6 / chapter 04 — the wire contract, the closed sets, the silent limits. */
router.get('/schema', getSchema);

/** Chapter 06 §06.2 — extract, validate, repair, and fall back if you must. */
router.post('/extract', validateBody(extractBodySchema), postExtract);

/** Chapter 09 §09.2 — first-pass validity, repair rate, issue distribution, cost. */
router.get('/metrics', getMetrics);
```

### Block by block

Four routes, and each one is a **chapter of the notes made callable**:

| Route | What it makes observable |
| :--- | :--- |
| `GET /health` | The enforcement rung and the silent limits (chapter 05) |
| `GET /schema` | The wire contract and the three artefacts (chapters 02, 04) |
| `POST /extract` | The whole reliability loop (chapter 06) |
| `GET /metrics` | Validity per rung, the issue distribution, cost (chapter 09) |

> **Why the middleware is attached at the route, not globally.** `validateBody(extractBodySchema)` sits on the one
> route that accepts a body. A global validator would need a per-route schema anyway, and this way the reader can see
> exactly which route is guarded by what — the same "one place, one policy" idea that runs through the whole lab.

---

## 6.4 `src/app.ts` (full file)

```ts
import express, { NextFunction, Request, Response } from 'express';
import { router } from './routes/index.js';

export const app = express();

app.use(express.json({ limit: '1mb' }));

/** One log line per request; the timestamp is what you grep for later. */
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api', router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource does not exist.' });
});

/**
 * Chapter 06 §06.1 — the HTTP layer's own boundary.
 *
 * Note how little can reach it. By the time a request gets here, every model
 * failure — a refusal, a truncation, a shape error, exhausted repairs — has
 * ALREADY been converted into a typed outcome by `extract()`. Only request-shape
 * problems and genuine infrastructure faults can still become a 5xx.
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = Number((error as { status?: number }).status) || 500;
  const titles: Record<number, string> = {
    400: 'Bad Request',
    403: 'Forbidden',
    404: 'Not Found',
    422: 'The model refused the request',
    502: 'Provider returned an unusable response',
    503: 'Model credentials are not configured',
  };

  console.error(`❌ ${status} ${error.message}`);
  res.status(status).json({ error: titles[status] ?? 'Internal Server Error', message: error.message });
});
```

### Block by block

**Block 1 — `express.json({ limit: '1mb' })`.** A body limit on the transport, *in addition to* the
`MAX_INPUT_CHARS` limit in the schema. Two limits, two different attacks: this one stops a 500 MB body from being
buffered at all; the schema one stops a large-but-bufferable text from becoming expensive.

**Block 2 — the request logger.** One line per request, with a timestamp. Deliberately not a logging library: the
lab's point is that **one trace per call** (chapter 09 §09.6) is the observability unit that matters, not
per-request noise.

**Block 3 — the error handler, and why almost nothing reaches it.** This is the most interesting comment in the file:

> *By the time a request gets here, every model failure has ALREADY been converted into a typed outcome by
> `extract()`.*

That is the payoff of chapter 06 §06.10. In a naive implementation, a refusal or a truncation would be a thrown error
and would land here as a `500` — indistinguishable from a genuine bug, and impossible to route differently. Because
`extract()` returns `Outcome<Meeting>`, the only things that can reach this handler are:

| What reaches here | Status | Example |
| :--- | :--- | :--- |
| A request-shape problem | `400` | Handled by `validateBody` before the controller |
| An unexpected infrastructure fault | `500` | A bug in your own code |
| An SDK-level failure the adapter did not map | `502` / `503` | Missing credentials |

The status-code *titles* include `422` and `502` — a hint that in a real system those could legitimately reach here,
but in this lab the controller handles them first. The mapping exists so the two paths agree.

**Block 4 — the 404 handler placement.** It sits *after* the router and *before* the error handler: the correct
Express order. Unmatched routes get a 404; only errors get the error handler.

---

## 6.5 `src/server.ts` (full file)

```ts
import { app } from './app.js';
import { ENFORCEMENT_LADDER, SEMANTIC_POLICY, config } from './config/config.js';
import { chooseEnforcement, enforcementReason, isOffline } from './lib/llm.js';
import { MEETING_TYPES, SCHEMA_VERSION, SILENT_LIMITS } from './schema/meeting.schema.js';

const server = app.listen(config.PORT, () => {
  console.log('=======================================================');
  console.log('🚀 Lecture 10 — Basic Structured Outputs Lab');
  console.log(`📡 Server        : http://localhost:${config.PORT}`);
  console.log(`🤖 Model         : ${config.AI_PROVIDER} · ${config.AI_MODEL} (temperature ${config.AI_TEMPERATURE})`);
  console.log(`🔑 Mode          : ${isOffline() ? 'OFFLINE stub — every endpoint still works' : 'LIVE provider'}`);
  console.log(`📐 Schema        : ${SCHEMA_VERSION}  (one declaration -> type + validator + wire contract — ch 02 §02.6)`);
  console.log(`🔒 Enforcement   : ${chooseEnforcement()}  of [${ENFORCEMENT_LADDER.join(' > ')}]  (ch 05 §05.7)`);
  console.log(`   └─ why        : ${enforcementReason()}`);
  console.log(`🎯 Closed set    : ${MEETING_TYPES.join(' | ')}  (ch 04 §04.4)`);
  console.log(`🔁 Loop          : ${config.MAX_REPAIRS} bounded repair(s) then the fallback ladder (ch 06 §06.7, §06.9)`);
  console.log(`🧪 Semantics     : duration > ${SEMANTIC_POLICY.reviewDurationMinutes} min -> review · start in the past -> block (ch 06 §06.6)`);
  console.log(`⚠️  Silent limits : ${SILENT_LIMITS.length} keywords the decoder does NOT enforce — Zod does (ch 05 §05.4.3)`);
  console.log('-------------------------------------------------------');
  console.log('🔍 GET    /api/health    (enforcement rung · silent limits · semantic policy)');
  console.log('📐 GET    /api/schema    (the wire contract + the three artefacts — ch 02 §02.6)');
  console.log('🧾 POST   /api/extract   (validate -> repair -> accept | degraded — ch 06 §06.2)');
  console.log('📊 GET    /api/metrics   (validity · repair rate · issue distribution — ch 09 §09.2)');
  console.log('=======================================================');
  console.log('Try:');
  console.log('  curl -s -X POST localhost:' + config.PORT + '/api/extract \\');
  console.log('    -H "content-type: application/json" \\');
  console.log('    -d \'{"text":"Schedule a Docker discussion with Rahul tomorrow at 4 PM for 30 minutes"}\'');
  console.log('  ...now omit the duration and watch the repair loop fix a wrong TYPE (ch 03 §03.2 #7).');
});

/**
 * Chapter 09 §09.8 — a clean stop.
 *
 * The traces and metrics are IN-MEMORY state, which is fine for a lab and wrong
 * for production: in a real system they go to the metrics store (chapter 09
 * §09.6), and the extraction cache is keyed per tenant.
 */
let shuttingDown = false;

const shutdown = (signal: string): void => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — closing the HTTP server.`);
  server.close(() => {
    console.log('✅ HTTP server closed cleanly.');
    process.exit(0);
  });
  server.closeAllConnections?.();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

### Block by block

**Block 1 — the banner.** Not vanity. It prints the four facts a learner must know *before* sending a request:

| Line | Why it matters |
| :--- | :--- |
| `Mode` | Is this the offline stub or a live provider? |
| `Enforcement` + `why` | Which rung of the ladder, and the reason for it |
| `Loop` | The repair bound — i.e. when the degraded rung will be reached |
| `Silent limits` | How many keywords the decoder does **not** enforce |

**Block 2 — the ready-to-paste `curl`.** The banner ends with the exact command to run, plus a hint about what to try
next. A lab should be usable within ten seconds of starting.

**Block 3 — graceful shutdown.** The `shuttingDown` guard prevents a double-shutdown race on `SIGINT` followed by
`SIGTERM`. `closeAllConnections?.()` uses optional call syntax so the code still runs on Node versions where the
method does not exist.

**Block 4 — the honest comment about in-memory state.** Chapter 09 §09.6 says traces belong in a metrics store and raw
outputs in a short-retention debug store. The comment says exactly that, so a learner does not mistake the lab's ring
buffer for a production design.

---

## 6.6 The layer map

| Layer | File | Owns | Does **not** own |
| :--- | :--- | :--- | :--- |
| Transport | `server.ts` | The listening socket, the banner, shutdown | Anything about requests |
| Middleware | `app.ts` | JSON parsing, logging, 404, error mapping | Validation policy |
| Routing | `routes/index.ts` | Which handler for which path | Business logic |
| Request validation | `middleware/validate.ts` | The request *shape* | The model output shape |
| Controller | `controllers/extraction.controller.ts` | HTTP lifecycle, outcome → status | Validation, repair, metrics |
| Service | `services/extraction.service.ts` | The loop, the checks, the traces, the metrics | HTTP, providers |
| Adapter | `lib/llm.ts` | Enforcement choice, the provider call | Whether the output is good enough |
| Schema | `schema/meeting.schema.ts` | The contract (all three artefacts) | Everything else |

> **Read the "does not own" column twice.** Every entry is a boundary that a real project usually blurs — and every
> blur is a place where a validation can be skipped.

---

**Next:** [Chapter 07 — Running & Verifying](./07_Running_and_Verifying.md)




