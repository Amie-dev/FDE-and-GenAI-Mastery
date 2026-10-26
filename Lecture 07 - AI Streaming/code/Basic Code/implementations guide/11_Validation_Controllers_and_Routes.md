# Chapter 11: Validation, Controllers & Routes

> **Chapter goal:** expose the domain through a thin HTTP boundary — validate the request shape *before* the
> first byte, own the stream lifecycle in exactly one place, and make cancellation a first-class part of the
> request. This is the chapter where chapters 05, 06 and 07 meet the network.
> **Notes chapters covered:** 02 §02.8 (validate before the first byte), 05 §05.1/§05.3.2 (headers first),
> 05 §05.3.3 (heartbeats), 06 §06.2 (an owner per hop), 06 §06.3 (the seven invariants), 06 §06.6
> (cancellation propagates upstream), 07 §07.7 (in-band errors), 09 §09.4 (persist the partial), 09 §09.8
> (the metrics endpoint).

---

## 11.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/middleware/validate.ts` | the four Zod request schemas · `validateBody` |
| `src/controllers/chat.controller.ts` | `getHealth` · `postChatBuffered` · `driveStream` · `postChatStreamRaw` · `postChatStreamEvents` · `getConversationHandler` · `getMetrics` · `INVARIANTS` |
| `src/routes/index.ts` | the wiring table — one row per hop, every hop owned |

---

## 11.2 Commands

```bash
npm run typecheck
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8097/api/chat \
  -H 'Content-Type: application/json' -d '{"conversationId":"x","message":""}'
```

---

## 11.3 `src/middleware/validate.ts` (full file)

```ts
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/config.js';

/**
 * Chapter 02 §02.8 — validate BEFORE the first byte.
 *
 * Streaming changes failure semantics: once `200 OK` and the first chunk have
 * left the server the status is frozen (chapter 07 §07.7). So everything that
 * could be a 400 must be a 400 *now*, not an in-band error later.
 */

/** Chapter 02 §02.8 — the request shape is the first thing to reject. */
export const chatRequestSchema = z.object({
  conversationId: z.string().min(1).max(120),
  message: z.string().min(1).max(config.MAX_INPUT_CHARS),
});

/**
 * Chapter 04 §04.6 — the fragmentation mode. `byte` is the one that proves a
 * client is transport-independent; a number is a fixed fragment size.
 */
const chunkSizeSchema = z.union([
  z.enum(['whole', 'char', 'byte', 'random', 'newline']),
  z.coerce.number().int().min(1).max(4096),
]);

/**
 * Chapter 04 §04.4 — a multi-byte payload is required to make the point, so the
 * default contains 1-, 2-, 3- and 4-byte characters. Single-line only: an SSE
 * `data:` frame cannot carry a raw newline.
 */
const codecPayloadSchema = z
  .string()
  .min(1)
  .max(4000)
  .refine((value) => !/[\r\n]/.test(value), { message: 'Use a single-line payload for the codec endpoints.' });

export const decodeRequestSchema = z.object({
  text: codecPayloadSchema.default('Spring ₹500 café naïve 日本語 😀'),
  chunkSize: chunkSizeSchema.default('byte'),
});

export const framesRequestSchema = z.object({
  text: codecPayloadSchema.default('Spring ₹500 café naïve 日本語 😀'),
  chunkSize: chunkSizeSchema.default('byte'),
});

export const tortureRequestSchema = z.object({
  text: codecPayloadSchema.default('Spring ₹500 café naïve 日本語 😀'),
  seed: z.coerce.number().int().min(0).default(42),
});

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

### Block by block

**The file header states the reason this middleware exists at all.** Chapter 02 §02.8 and chapter 07 §07.7
together say: *after the first byte, the status is frozen*. So the middleware is not a nicety — it is the only
place where a bad request can still become a proper `400`.

**`chatRequestSchema` has a `max` on the message, and the limit comes from config.** `config.MAX_INPUT_CHARS`
is the request-shape cap. It exists for the same reason `max_tokens` does (chapter 09 §09.9): bounded input
means bounded cost and bounded prefill — and prefill is a TTFT tax (chapter 03 §03.4).

**`chunkSizeSchema` is a `z.union` of a string enum and a coerced number.** That single line is why the codec
endpoints accept both `"byte"` and `64`, and why the service's `FragmentMode` union has a `number` member. The
validation schema and the domain type were designed together.

**`codecPayloadSchema`'s `.refine()` encodes a real constraint, not a preference.**

```ts
.refine((value) => !/[\r\n]/.test(value), { message: 'Use a single-line payload for the codec endpoints.' })
```

An SSE `data:` line cannot contain a raw newline — a newline *ends the line*, so the frame would be split in a
way the parser is not expecting. Rejecting it up front with a clear message is better than producing a confusing
parse result. The default value is deliberately multi-byte (`₹`, `é`, `ï`, `日本語`, `😀`) so a bare
`curl -X POST … -d '{}'` still demonstrates the lecture.

**`validateBody` replaces `req.body` with the *parsed* data.**

```ts
req.body = parsed.data;
```

That is the detail people miss. Zod's `.default()` values and `.coerce` transformations only exist on
`parsed.data`; the raw body still has strings and missing keys. Assigning the parsed result means every
downstream handler receives a fully-typed object with defaults applied — which is why `postTorture` can assume
`seed` is a number.

**The 400 response shape is `{ error, details }` with field-level errors.** `parsed.error.flatten().fieldErrors`
turns Zod's tree into `{ message: ["…"] }`, so a client can highlight the offending field. Compare with the
in-band `error` event (chapter 07 §07.7), which carries `{ code, message, recoverable }` — two different error
contracts, because they arrive at two different times.

---

## 11.4 `src/controllers/chat.controller.ts` — part 1 (full)

```ts
import { NextFunction, Request, Response } from 'express';
import { config, PUMP_POLICY } from '../config/config.js';
import { isOffline } from '../lib/llm.js';
import {
  frameEvent,
  openRawTextStream,
  openSseStream,
  sendDone,
  sendError,
  sendEvent,
  sendHeartbeat,
} from '../lib/sse.js';
import { chatBuffered, interruptTurn, prepareTurn, streamTurn } from '../services/chat.service.js';
import { getConversation as loadConversation, listConversations } from '../services/conversation.service.js';
import { activeStreams, beginStream, endStream, metricsSummary } from '../services/metrics.service.js';
import { writeWithBackpressure } from '../services/pump.service.js';

/**
 * Chapter 06 §06.2 — controllers stay thin.
 *
 * No prompt text, no token maths, no provider details. What lives here is the
 * HTTP lifecycle, which is exactly what the notes assign to this layer: headers
 * before the first byte, flush, cancellation, close, cleanup.
 */

/** Chapter 06 §06.3 — the seven invariants, as data, so /api/health can state them. */
const INVARIANTS = [
  'forward, do not accumulate',
  'flush per chunk',
  'intermediaries must not buffer',
  'the connection must not idle out',
  'the client must read incrementally',
  'the UI must append, not replace',
  'cancellation must propagate upstream',
];

/** Chapter 06 §06.2 — what this process is wired to, and which policy is live. */
export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'UP',
    mode: isOffline() ? 'OFFLINE (no provider key — deterministic stub)' : 'LIVE',
    provider: config.AI_PROVIDER,
    model: config.AI_MODEL,
    endpoint: config.AI_ENDPOINT,
    transports: ['buffered', 'raw text (text/plain)', 'sse (text/event-stream)'],
    pumpPolicy: PUMP_POLICY,
    heartbeatMs: config.HEARTBEAT_MS,
    readingSpeedTps: config.READING_TPS,
    pipelineInvariants: INVARIANTS,
    activeStreams: activeStreams(),
    conversations: listConversations().length,
    uptimeSeconds: Math.floor(process.uptime()),
  });
};
```

### Block by block

**The import list is a map of the chapter.** `lib/sse` supplies framing, `services/chat` supplies the
orchestration, `services/conversation` supplies the transcript, `services/metrics` supplies the counters, and
`services/pump` supplies the backpressure helper. Nothing else is needed — which is the thinness chapter 06
§06.2 asks for.

**`INVARIANTS` turns chapter 06 §06.3's table into a runtime value.** The seven strings are the notes' seven
invariants, and `/api/health` returns them. Two things follow: an operator can read the contract from a live
process, and — more usefully — the list becomes something a test can assert against rather than a paragraph in a
design document.

**`getHealth` is the endpoint that answers "what am I actually running?".**

| Field group | Why it is there |
| :--- | :--- |
| `mode`, `provider`, `model`, `endpoint` | which provider is live — the first question in any latency investigation |
| `transports` | the three delivery shapes this process implements (chapter 02 §02.7) |
| `pumpPolicy`, `heartbeatMs` | the delivery settings, so "why is it chunky?" has an answer |
| `readingSpeedTps` | the threshold that makes `fasterThanReading` meaningful (chapter 03 §03.3) |
| `pipelineInvariants` | the contract, as data |
| `activeStreams` | whether anything is in flight right now |
| `conversations`, `uptimeSeconds` | enough liveness to tell "restarted" from "wedged" |

---

## 11.5 `src/controllers/chat.controller.ts` — part 2 (full)

```ts
/**
 * Chapter 02 §02.2 / chapter 07 §07.1 — the BUFFERED endpoint.
 *
 * Chapter 07 §07.1 is explicit that this is the `String` return type: there is
 * exactly one value and it exists only after completion. The note in the response
 * is the whole point of the chapter — the deltas were always there.
 */
export const postChatBuffered = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { conversationId, message } = req.body as { conversationId: string; message: string };
    const { turn, text } = await chatBuffered(conversationId, message);

    res.status(200).json({
      success: true,
      data: {
        transport: 'buffered',
        conversationId,
        messageId: turn.messageId,
        answer: text,
        /** The server saw a first delta here — but delivered nothing (chapter 03 §03.2). */
        serverFirstDeltaMs: turn.firstTokenAt === null ? null : turn.firstTokenAt - turn.startedAt,
        /** What the user actually waited, because delivery was withheld. */
        clientSeesTextAtMs: Date.now() - turn.startedAt,
        deltasConsumed: turn.deltas,
        note: 'Chapter 02 §02.2 — the chunks existed; this endpoint chose to accumulate them.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Chapter 06 §06.2 — the shared stream lifecycle.
 *
 * Both streaming transports use the SAME driver; only the sink differs. That is
 * the "two streams, one bridge" shape from chapter 06 §06.1.
 */
const driveStream = async (req: Request, res: Response, transport: 'raw' | 'sse'): Promise<void> => {
  const { conversationId, message } = req.body as { conversationId: string; message: string };
  const turn = prepareTurn(conversationId, message);

  /**
   * Chapter 06 §06.6 — cancellation must propagate upstream.
   * We listen on the RESPONSE, not the request: on a POST the request stream has
   * already finished by the time this handler runs, so `req.on('close')` would
   * fire immediately.
   */
  const abort = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abort.abort();
  });

  beginStream();

  // Chapter 05 §05.1/§05.3.2 — headers BEFORE the first body byte: the status commits on first write.
  if (transport === 'sse') openSseStream(res);
  else openRawTextStream(res);

  /**
   * Chapter 05 §05.3.3 — only SSE can carry a no-op frame. In raw text every byte
   * is payload, so a whitespace heartbeat would corrupt the answer.
   */
  const heartbeat = transport === 'sse' ? setInterval(() => sendHeartbeat(res), config.HEARTBEAT_MS) : null;

  /** The sink: the pump owns the policy, this owns the framing (chapter 07 §07.6). */
  const write =
    transport === 'sse'
      ? (text: string): Promise<void> => writeWithBackpressure(res, frameEvent('token', { text }))
      : (text: string): Promise<void> => writeWithBackpressure(res, text);

  try {
    if (transport === 'sse') {
      sendEvent(res, 'status', { phase: 'generating', model: config.AI_MODEL, conversationId });
    }

    const { result, finishReason } = await streamTurn(turn, transport, write, abort.signal);

    if (transport === 'sse') {
      // Chapter 09 §09.5 — usage only exists now, so it is the last data event.
      sendEvent(res, 'usage', turn.usage);
      sendEvent(res, 'done', {
        finishReason,
        ttftMs: turn.firstTokenAt === null ? null : turn.firstTokenAt - turn.startedAt,
        itlMs: turn.deltas > 1 ? Math.round(turn.gapTotalMs / (turn.deltas - 1)) : null,
      });
      sendDone(res);
    } else if (!res.writableEnded) {
      res.end();
    }

    void result;
  } catch (error) {
    /**
     * Chapter 09 §09.4 — the failure hook. The text the user already read is
     * persisted with status `interrupted`, never thrown away.
     */
    interruptTurn(turn, transport, { frames: 0, chars: turn.buffer.join('').length });

    if (!res.writableEnded) {
      // Chapter 07 §07.7 — the status is already 200, so the error goes in-band.
      if (transport === 'sse') sendError(res, 'generation_failed', (error as Error).message);
      else res.end();
    }
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    endStream();
  }
};

/** Chapter 05 §05.5 — raw text streaming: the simplest correct transport. */
export const postChatStreamRaw = (req: Request, res: Response, next: NextFunction): void => {
  driveStream(req, res, 'raw').catch(next);
};

/** Chapter 05 §05.3 — SSE: the same stream with typed events. */
export const postChatStreamEvents = (req: Request, res: Response, next: NextFunction): void => {
  driveStream(req, res, 'sse').catch(next);
};
```

---

## 11.6 `src/controllers/chat.controller.ts` — part 3 (full)

```ts
/**
 * Chapter 09 §09.2 — the proof of the dual-write pattern.
 * Whatever transport was used, one exchange produced exactly ONE assistant turn.
 */
export const getConversationHandler = (req: Request, res: Response): void => {
  const conversation = loadConversation(String(req.params.conversationId ?? ''));

  if (!conversation) {
    res.status(404).json({ error: 'Not Found', message: 'No such conversation.' });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      conversationId: conversation.conversationId,
      turns: conversation.turns,
      turnCount: conversation.turns.length,
      assistantTurns: conversation.turns.filter((turn) => turn.role === 'assistant').length,
      note: 'Chapter 09 §09.1 — one exchange is ONE assistant turn, whatever the transport.',
    },
  });
};

/** Chapter 03 §03.5 / chapter 09 §09.8 — the metrics that catch streaming regressions. */
export const getMetrics = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      ...metricsSummary(),
      pumpPolicy: PUMP_POLICY,
      heartbeatMs: config.HEARTBEAT_MS,
      note: 'Chapter 09 §09.8 — client TTFT is not here: only the browser knows it, which is why the TTFT gap is the alert.',
    },
  });
};
```

### Block by block — the buffered endpoint and the lifecycle

**`postChatBuffered` reports two numbers that make the chapter's argument measurable.**

| Field | Meaning |
| :--- | :--- |
| `serverFirstDeltaMs` | when the server *saw* the first delta — the honest server-side TTFT |
| `clientSeesTextAtMs` | when the client *received* anything — which equals total time, because delivery was withheld |
| `deltasConsumed` | proof that the deltas existed all along (chapter 02 §02.2) |

Those three fields are chapter 02 §02.2 in one JSON object: the server was ready at ~276 ms, the client got text
at ~1100 ms, and 34 deltas were thrown away in between.

**`driveStream` is one function serving two transports, and the `transport` parameter is the only difference.**
That is the payoff of the transport-agnostic pump: the raw-text endpoint and the SSE endpoint share the headers,
the abort wiring, the heartbeat decision, the error handling and the cleanup. Only two lines differ — the opener
and the writer.

**`res.on('close')` — and the comment explains why it is not `req.on('close')`.**

```ts
res.on('close', () => {
  if (!res.writableEnded) abort.abort();
});
```

On a `POST`, the *request* body has already been fully read by the time the handler runs, so the request stream
has closed and `req.on('close')` would fire immediately — aborting every stream the instant it started. The
**response** is the object that stays open for the duration of generation, so it is the one that tells you the
client left. The `writableEnded` check distinguishes "the client disconnected" from "we finished normally and
then the socket closed", which would otherwise produce a spurious abort on every successful request.

**`beginStream()` / `endStream()` bracket the whole lifecycle, and `endStream()` is in `finally`.** Chapter 09
§09.7 item 21 needs an accurate in-flight count to drain on shutdown; a counter that leaks on the error path is
worse than no counter, because it would make the drain loop wait forever. The `finally` guarantees the decrement
exactly once.

**`beginStream()` is called *after* `prepareTurn`.** The counter measures *streams in flight*, and a turn that
was prepared but never streamed is not one. It is incremented *before* the headers go out, so the count is never
zero while bytes are on the wire.

**The heartbeat is created only for SSE, and `setInterval` is paired with `clearInterval` in `finally`.**

```ts
const heartbeat = transport === 'sse' ? setInterval(() => sendHeartbeat(res), config.HEARTBEAT_MS) : null;
```

Chapter 05 §05.3.3 explains the asymmetry: a heartbeat must be a *no-op frame*, and only SSE has comment syntax.
In raw text every byte is payload, so a periodic whitespace write would insert spaces into the answer. Forgetting
the `clearInterval` would leave a timer writing to a finished response — a slow leak and, eventually, a
`write after end` error.

**The writer ternary is where framing lives.**

```ts
const write = transport === 'sse'
  ? (text: string) => writeWithBackpressure(res, frameEvent('token', { text }))
  : (text: string) => writeWithBackpressure(res, text);
```

Two lines, and they are the only place in the controller that knows what a frame looks like. Note the
backpressure helper is applied *outside* the framing call: the pump decides *when* to write, the writer decides
*what* to write, and `writeWithBackpressure` decides *whether the socket can take it*.

**The `status` event is sent before the pump starts, and that is a UX decision.** It gives the client something
to render during prefill — the ~250 ms in which no token can possibly exist (chapter 01 §01.3). Without it, the
client's first event would be a token, and any "thinking…" indicator would have nothing to trigger on.

**`usage` → `done` → `[DONE]`, in that order, is the contract.** Usage is only known after generation ends
(chapter 09 §09.5), so it must come after the last token and before the terminal event. A client that expected
`usage` after `done` would never see it.

**`void result;` is not dead code.** `streamTurn` returns `{ result, finishReason }`, and `result` holds
`frames`, `chars`, `firstAt` and `endedAt`. The controller does not need them — they are already recorded in the
metrics row — but destructuring only `finishReason` would be confusing. The explicit `void` says "deliberately
ignored" rather than leaving a reader wondering whether something was forgotten.

**The `catch` block is the chapter 09 §09.4 failure hook, and its order matters.**

```ts
interruptTurn(turn, transport, { frames: 0, chars: turn.buffer.join('').length });
if (!res.writableEnded) { … }
```

Persist **first**, then tell the client. If the notification fails (or the socket is already gone), the partial
answer is still in the conversation store — and the next prompt will include the text the user actually read.
Note `chars: turn.buffer.join('').length` rather than `0`: the metrics row should record what was produced, not
what was successfully written.

**`if (!res.writableEnded)` guards every terminal write.** After an abort the response may already be ended, and
calling `res.end()` again throws. Checking the flag keeps the error path silent instead of noisy — and the
`AbortError` case is expected, not exceptional (chapter 08 §08.11).

**`getConversationHandler` returns `assistantTurns` as a first-class field.** It is the one number that proves
the dual write: three exchanges through three transports must produce `turnCount: 6, assistantTurns: 3`. If a bug
ever wrote one turn per chunk, this number would be in the hundreds — and the note in the response is the first
place you would look.

**`getMetrics` merges `metricsSummary()` with the live policy.** The policy is included so a reader can see the
coalescing settings *next to* the `charsPerFrame` they produced — the two numbers you need together to decide
whether the delivery is healthy.

---

## 11.7 `src/routes/index.ts` (full file)

```ts
import { Router } from 'express';
import {
  getConversationHandler,
  getHealth,
  getMetrics,
  postChatBuffered,
  postChatStreamEvents,
  postChatStreamRaw,
} from '../controllers/chat.controller.js';
import { postDecode, postFrames, postTorture } from '../controllers/codec.controller.js';
import {
  chatRequestSchema,
  decodeRequestSchema,
  framesRequestSchema,
  tortureRequestSchema,
  validateBody,
} from '../middleware/validate.js';

export const router = Router();

/** Chapter 06 §06.2 — the wiring table: one row per hop, and every hop has an owner. */
router.get('/health', getHealth);

/** Chapter 07 §07.1 — the `String` return type: one value, at the end. */
router.post('/chat', validateBody(chatRequestSchema), postChatBuffered);

/** Chapter 05 §05.5 — the same stream as raw `text/plain`, chunked. */
router.post('/chat/stream', validateBody(chatRequestSchema), postChatStreamRaw);

/** Chapter 05 §05.3 — the same stream as `text/event-stream` with typed events. */
router.post('/chat/events', validateBody(chatRequestSchema), postChatStreamEvents);

/** Chapter 09 §09.2 — the dual-write proof: ONE assistant turn per exchange. */
router.get('/conversation/:conversationId', getConversationHandler);

/** Chapter 03 §03.5 — TTFT, ITL, TPS, frames, chars-per-frame, aborts, finish reasons. */
router.get('/metrics', getMetrics);

/** Chapter 04 §04.4 — the four granularities, and the UTF-8 split. */
router.post('/codec/decode', validateBody(decodeRequestSchema), postDecode);

/** Chapter 04 §04.3 — frame reassembly and the leftover buffer. */
router.post('/codec/frames', validateBody(framesRequestSchema), postFrames);

/** Chapter 04 §04.6 / chapter 09 §09.10 — the CI assertion, as an endpoint. */
router.post('/codec/torture', validateBody(tortureRequestSchema), postTorture);
```

### Block by block

**Every route is one line, and every line carries the chapter it implements.** That is the whole file: no
middleware stacks, no nested routers, no versioning. The value is that this is the one place you can read to
answer "what does this service expose?" — and the chapter comments make it a map back to the notes.

**The three chat routes are deliberately adjacent, in order of delivery.**

| Route | Delivery | Chapter |
| :--- | :--- | :--- |
| `POST /chat` | one JSON body, at the end | 07 §07.1 |
| `POST /chat/stream` | raw `text/plain`, progressive | 05 §05.5 |
| `POST /chat/events` | SSE `text/event-stream`, typed | 05 §05.3 |

Reading them top to bottom is chapter 02 §02.7's delivery-path taxonomy, reduced to the three this lab
implements. They share one request schema, because the *request* is identical — only the response shape differs.
That is the notes' point in the route table: delivery is a response-side decision.

**`validateBody(schema)` is composed per route rather than applied globally.** A global `validateBody` would need
a single schema for every endpoint, and the codec endpoints take a completely different body (`text`,
`chunkSize`) than the chat endpoints (`conversationId`, `message`). Composing the validator with its schema at
the route is the smallest correct version — and it keeps each schema next to the route that uses it.

**The codec routes are grouped at the bottom, and the grouping is a boundary.** They take no `conversationId`,
touch no provider, and are deterministic: given the same `text` and `seed`, `POST /codec/torture` returns the same
ten rows forever. That determinism is what makes it usable as a build gate, and keeping it visibly separate from
the chat routes says so.

**`GET /metrics` and `GET /health` have no validation, and that is correct.** They take no body. Their only input
is the process state.

---

## 11.8 Verifying this chapter

```bash
# 400 before the first byte — validation is the first guardrail
curl -s -X POST http://localhost:8097/api/chat -H 'Content-Type: application/json' \
  -d '{"conversationId":"x","message":""}' | python3 -m json.tool

# 400 with a field-level detail — the newline rule for SSE payloads
curl -s -X POST http://localhost:8097/api/codec/decode -H 'Content-Type: application/json' \
  -d '{"text":"a\nb"}' | python3 -m json.tool

# 404s come from app.ts, not from a handler
curl -s -o /dev/null -w 'unknown route -> %{http_code}\n' http://localhost:8097/api/nope
curl -s -o /dev/null -w 'unknown conv  -> %{http_code}\n' http://localhost:8097/api/conversation/nope
```

Expected: `400` with `{"error": "Validation failed", "details": {"message": ["String must contain at least 1 character(s)"]}}`;
then `400` with the newline message; then `404` twice.

---

**Previous:** [Chapter 10 — Metrics & the TTFT Gap](./10_Metrics_and_the_TTFT_Gap.md) ·
**Next:** [Chapter 12 — App, Server & Graceful Shutdown](./12_App_Server_and_Graceful_Shutdown.md)