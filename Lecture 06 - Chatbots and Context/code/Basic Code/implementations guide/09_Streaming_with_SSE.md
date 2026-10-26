# Chapter 09: Streaming with SSE

> **Chapter goal:** stop hiding incremental generation behind a buffer. Set the SSE headers correctly, frame
> the events deliberately, and make cancellation a first-class part of the request lifecycle.
> **Notes chapters covered:** 05 §05.1 (autoregressive reality), §05.2 (the buffering bottleneck),
> §05.4 (why SSE wins for chat), §05.5 (the wire format), §05.7 (server side), §05.9 (production hazards).

---

## 9.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/lib/sse.ts` | the SSE wire format: `openSseStream` · `sendEvent` · `sendHeartbeat` · `sendDone` · `sendError` |
| `src/lib/llm.ts` | `callModel` (buffered) · `streamModel` (deltas) · `isOffline` · the OFFLINE stub |

> The controller that *uses* these lives in chapter 11. This chapter is the transport; chapter 11 is the
> lifecycle that drives it.

---

## 9.2 Commands

```bash
npm run typecheck
```

---

## 9.3 `src/lib/sse.ts` (full file)

```ts
import type { Response } from 'express';

/**
 * Chapter 05 §05.5 — the SSE wire format, in one place.
 *
 * Remember there are TWO protocols stacked here: SSE is the transport framing
 * (`event:` / `data:` / `id:` lines, events terminated by a blank line), and the
 * JSON inside `data:` is *our* application protocol. Design the second layer
 * deliberately — you will add event types (citations, usage, tool calls) sooner
 * than you expect.
 */

/** §05.5 — set every header BEFORE the first body byte: the status commits on first write. */
export const openSseStream = (res: Response): void => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Without this, Nginx buffers 4-16 KB and the user sees a stall, then a burst.
    'X-Accel-Buffering': 'no',
  });
  // Makes the browser's fetch() promise resolve immediately, so the UI can show "streaming".
  res.flushHeaders?.();
};

/** §05.5 — one event. `event:` names the type; `data:` carries the JSON payload. */
export const sendEvent = (res: Response, event: string, data: unknown): void => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

/** §05.5 — a comment frame. Clients ignore it; idle-connection timeouts do not. */
export const sendHeartbeat = (res: Response): void => {
  res.write(': keep-alive\n\n');
};

/** §05.5 — the OpenAI-style sentinel that gives the client an unambiguous completion signal. */
export const sendDone = (res: Response): void => {
  res.write('data: [DONE]\n\n');
  res.end();
};

/**
 * §05.7 — once the status is 200 an error cannot become a 500,
 * so typed errors travel *inside* the stream.
 */
export const sendError = (res: Response, code: string, message: string): void => {
  sendEvent(res, 'error', { code, message });
  sendDone(res);
};
```

### Block by block

**The two-layer protocol, stated up front.** The file's header comment is the most important line in it:

> *SSE is the transport framing (`event:` / `data:` / `id:` lines, events terminated by a blank line), and
> the JSON inside `data:` is **our** application protocol.*

Beginners conflate the two, then wonder why adding a `citation` event "breaks" their parser. They are separate
designs, and §05.5 says so: *"design the second layer deliberately — you will add event types (tool calls,
citations, usage) sooner than you expect."* This lab adds three (`citation`, `guardrail`, `done`).

**`openSseStream` — headers before the first byte.**

```ts
res.writeHead(200, {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
});
res.flushHeaders?.();
```

| Header | Notes reason (§05.5, §05.7) |
| :--- | :--- |
| `text/event-stream` | The client *and* every proxy must know this is an event stream, not a document |
| `no-cache, no-transform` | Stops intermediaries rewriting or buffering the body |
| `keep-alive` | The connection stays open for the duration of generation |
| `X-Accel-Buffering: no` | **Without it, Nginx buffers 4–16 KB before forwarding** — the user sees a stall, then a burst |
| `flushHeaders()` | Makes the browser's `fetch()` promise resolve immediately, so the UI can render a "streaming" state |

The comment on `writeHead` records the constraint that shapes the whole controller: *the status commits on
first write.* Once these headers are out, you can never send a 404 or a 500 on this request — which is why the
controller validates everything **before** calling this function.

**`sendEvent` — one event, three lines of format.**

```ts
res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
```

Every part is required by the spec:

- `event: name` — the client's `EventSource`/reader can dispatch on it
- `data: ` — note the **space**; the payload follows the prefix
- `\n\n` — the blank line that terminates the event. Parsers split on the blank line, **not** on the JSON

The `JSON.stringify` matters for a subtle reason: a token containing a newline would otherwise break the
frame, because a raw `\n` inside `data:` starts a *new line of the same event*. JSON encoding escapes it.

**`sendHeartbeat` — the comment frame.**

```ts
res.write(': keep-alive\n\n');
```

A line beginning with `:` is a comment; clients ignore it. But idle-connection timeouts do not — proxies and
load balancers will close a stream that has been silent for 30–60 seconds. Heartbeats keep it alive during a
slow first token or a long tool call.

**`sendDone` — the sentinel.**

```ts
res.write('data: [DONE]\n\n');
res.end();
```

`[DONE]` is not part of the SSE spec; it is a convention from the OpenAI-style APIs that gives the client an
unambiguous, protocol-level completion signal. Without it, the client has to infer completion from the socket
closing — which cannot distinguish "finished" from "the network died".

**`sendError` — errors travel inside the stream.**

```ts
export const sendError = (res: Response, code: string, message: string): void => {
  sendEvent(res, 'error', { code, message });
  sendDone(res);
};
```

Once the status is 200, a failure cannot become a 500. §05.7: *"typed errors travel inside the stream."*
Sending an `error` event **and** `[DONE]` means the client has both a reason and a clean termination.

---

## 9.4 `src/lib/llm.ts` (full file)

```ts
import OpenAI from 'openai';
import { config } from '../config/config.js';
import { REFUSAL_TEXT } from '../config/prompts.js';
import type { ChatTurn } from '../types/chat.types.js';

/**
 * Chapter 05 — the one place that talks to a model.
 *
 * Everything else in this lab (sessions, budgeting, context assembly, guardrails)
 * is provider-agnostic; only this file knows about the network.
 */

/** Chapter 05 §05.3 — what a buffered call reports back. */
export interface ModelResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  model: string;
  finishReason: string;
}

const client = new OpenAI({
  apiKey: config.AI_API_KEY || 'not-needed', // Ollama runs locally and needs none
  baseURL: config.AI_ENDPOINT,
  maxRetries: 0,
  timeout: 60_000,
});

/**
 * Chapter 05 §05.7 — with no provider key the lab runs in OFFLINE mode.
 * The whole pipeline (context assembly, SSE framing, guardrails) still runs end
 * to end against a deterministic stub, so chapters 01-05 are studyable with zero spend.
 */
export const isOffline = (): boolean => config.AI_PROVIDER !== 'ollama' && !config.AI_API_KEY;

/**
 * A deterministic stand-in, NOT a model.
 * It answers from the first retrieved chunk and cites it, which is exactly the
 * behaviour chapter 07 wants — so the verifier has something real to check.
 * The caller can tell it is offline from `usage.model === 'offline-stub'`.
 */
const offlineReply = (messages: ChatTurn[]): string => {
  const joined = messages.map((message) => message.content).join('\n');

  // Compaction request (chapter 03 §03.4) — an extractive stand-in for a summariser.
  if (joined.includes('Summarise the conversation segment')) {
    const segment = messages[messages.length - 1]?.content ?? '';
    return segment
      .split('\n')
      .map((line) => line.trim())
      // Drop the [SEGMENT] marker and any bullet prefixes before re-summarising.
      .filter((line) => line.length > 0 && !line.startsWith('['))
      .map((line) => line.replace(/^-\s*/, ''))
      .slice(0, 6)
      .map((line) => `- ${line.slice(0, 100)}`)
      .join('\n');
  }

  const context = joined.match(/\[CONTEXT\]\n([\s\S]*?)(?:\n\[|$)/)?.[1] ?? '';
  const firstChunk = context.split('\n').find((line) => line.startsWith('['));

  // No evidence retrieved → the calibrated refusal (chapter 07 §07.6).
  if (!firstChunk) return REFUSAL_TEXT;

  const id = firstChunk.slice(1, firstChunk.indexOf(']'));
  const fact = firstChunk.slice(firstChunk.indexOf(']') + 1).trim();
  return `${fact}\nCITATIONS: ${id}`;
};

/** Chapter 05 §05.2 — the buffered path: nothing is visible until generation finishes. */
export const callModel = async (messages: ChatTurn[]): Promise<ModelResult> => {
  const startedAt = Date.now();

  if (isOffline()) {
    const text = offlineReply(messages);
    return {
      text,
      inputTokens: Math.ceil(messages.map((message) => message.content).join('').length / 4),
      outputTokens: Math.ceil(text.length / 4),
      latencyMs: Date.now() - startedAt,
      model: 'offline-stub',
      finishReason: 'stop',
    };
  }

  const response = await client.chat.completions.create({
    model: config.AI_MODEL,
    messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: config.AI_TEMPERATURE,
    max_tokens: config.AI_MAX_TOKENS,
  });

  const choice = response.choices[0];

  return {
    text: choice?.message?.content?.trim() ?? '',
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - startedAt,
    model: response.model ?? config.AI_MODEL,
    finishReason: choice?.finish_reason ?? 'unknown',
  };
};

/**
 * Chapter 05 §05.1 — the streamed path.
 * Generation is already incremental; this just stops hiding it behind a buffer.
 * The `signal` is what prevents orphaned generation when the client disconnects (§05.9).
 */
export async function* streamModel(messages: ChatTurn[], signal?: AbortSignal): AsyncGenerator<string> {
  if (isOffline()) {
    for (const token of offlineReply(messages).match(/\S+\s*/g) ?? []) {
      await new Promise((resolve) => setTimeout(resolve, 20)); // visible cadence
      yield token;
    }
    return;
  }

  const stream = await client.chat.completions.create(
    {
      model: config.AI_MODEL,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: config.AI_TEMPERATURE,
      max_tokens: config.AI_MAX_TOKENS,
      stream: true,
    },
    { signal },
  );

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    // §05.7 — role-only and usage-only frames arrive with an empty delta.
    if (!delta) continue;
    yield delta;
  }
}
```

### Block by block

**One client, built at boot.**

```ts
const client = new OpenAI({
  apiKey: config.AI_API_KEY || 'not-needed',
  baseURL: config.AI_ENDPOINT,
  maxRetries: 0,
  timeout: 60_000,
});
```

`maxRetries: 0` keeps the call honest: a retry would silently double your token bill and make latency
measurements meaningless. If a request fails, you want to see it fail. The `|| 'not-needed'` lets Ollama
(which runs locally and has no key) work through the same client.

**`isOffline` — the switch that makes this lab free.**

```ts
export const isOffline = (): boolean => config.AI_PROVIDER !== 'ollama' && !config.AI_API_KEY;
```

This is a *capability* check, not a feature flag. `GET /api/health` reports it, `server.ts` prints it at boot,
and both model functions branch on it. Critically, it does **not** change any of the context, memory,
guardrail or verification code — those are provider-independent, which is the point.

**`offlineReply` — a deterministic stand-in, not a model.**

```ts
if (!firstChunk) return REFUSAL_TEXT;
const id = firstChunk.slice(1, firstChunk.indexOf(']'));
const fact = firstChunk.slice(firstChunk.indexOf(']') + 1).trim();
return `${fact}\nCITATIONS: ${id}`;
```

This stub is deliberately built to be *correct* rather than clever:

| Behaviour | Why it matters for learning |
| :--- | :--- |
| Reads the `[CONTEXT]` block | Proves the assembled payload really does contain the evidence |
| Returns the chunk text verbatim | The verifier's overlap ratio comes out high and honest (~0.9), so the passing case is real |
| Emits `CITATIONS: <id>` | Exercises the whole §07.8 verification path |
| Returns `REFUSAL_TEXT` when there is no evidence | Exercises the §07.6 refusal path — the two branches are the whole of chapters 06–07 |
| Handles the compaction instruction | So `/api/chat` past the summarise threshold produces a real summary instead of garbage |

The tag is **not** prepended to the answer text, and the comment says why: `usage.model === 'offline-stub'`
already tells the caller. A marker inside the text would pollute the verifier's keyword overlap and make a
passing verification look marginal.

**`callModel` — the buffered path.**

```ts
const response = await client.chat.completions.create({
  model: config.AI_MODEL,
  messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
  temperature: config.AI_TEMPERATURE,
  max_tokens: config.AI_MAX_TOKENS,
});
```

We send a `messages` **array**, not a pre-templated string. This is the Lecture 05 §06.8 point: the provider
applies the model's own chat template. Pre-templating ("double templating") is a classic bug that produces
subtly wrong output with no error message.

The return type exists so the ledger can be filled without guessing:

```ts
return { text, inputTokens: response.usage?.prompt_tokens ?? 0, outputTokens: …, latencyMs, model, finishReason };
```

Note `latencyMs: Date.now() - startedAt` — measured here, not by the caller, so the number is comparable
across every path.

**`streamModel` — an async generator, and the reason the endpoint works.**

```ts
export async function* streamModel(messages: ChatTurn[], signal?: AbortSignal): AsyncGenerator<string> {
```

Four design choices:

| Choice | Notes reason |
| :--- | :--- |
| **Async generator**, not a callback | The controller can `for await` it, so cancellation and error handling are ordinary `try/catch` |
| **Yields `string`, not a chunk object** | The provider's chunk shape stops here. Everything downstream deals in text |
| **`signal?: AbortSignal`** | This is the whole of §05.9's "orphaned generation" defence — when the client leaves, the request aborts and the provider stops billing |
| **`if (!delta) continue`** | §05.7: role-only and usage-only frames arrive with an empty delta. Writing them produces empty SSE frames |

The offline branch sleeps 20 ms between tokens, which is not decoration — without it the entire answer
arrives in one tick and you cannot *see* that streaming works. A lab that streams instantly teaches nothing
about perceived latency.

---

## 9.5 The wire format, side by side

What `POST /api/chat/stream` actually writes (captured from a real run):

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
Transfer-Encoding: chunked

event: start
data: {"messageId":"9ad5e59d-…","model":"gpt-4o-mini","tokensByTier":{"system":333,"grounded":240,"history":0,"current":12}}

event: token
data: {"delta":"Service "}

event: token
data: {"delta":"areas: "}

event: citation
data: {"ids":["kb_delivery_areas"]}

event: done
data: {"finishReason":"stop","totalTokens":37,"ttftMs":21,"itlMs":21,"isRefusal":false}

data: [DONE]
```

Compare that to §05.5's protocol table — every field is used as the notes describe it:

| Field | §05.5 purpose | Here |
| :--- | :--- | :--- |
| `event:` | names the event type | `start`, `token`, `citation`, `guardrail`, `done`, `error` |
| `data:` | the payload | JSON, always |
| `:comment` | ignored by clients, keeps the connection alive | `sendHeartbeat()` — not shown, because this stream is too short to need one |
| `data: [DONE]` | the completion sentinel | the last line |

**The two timing numbers come from here.** §05.3 defines TTFT (time to first token) and ITL
(inter-token latency). `postChatStream` measures them around the `for await` loop and reports them in the
`done` event — so the stream tells you not just *what* the model said, but *how* it felt.

---

## 9.6 Verify

```bash
SID=$(curl -s -X POST http://localhost:8090/api/session -H 'x-user-id: u_101' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.sessionId')

# headers first — note X-Accel-Buffering and chunked encoding
curl -s -D - -o /dev/null -N -X POST http://localhost:8090/api/chat/stream \
  -H 'x-user-id: u_101' -H 'content-type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"message\":\"Can I order food in Hyderabad?\"}" | head -8

# then the frames themselves (-N disables curl's own buffering — do not omit it)
curl -s -N -X POST http://localhost:8090/api/chat/stream \
  -H 'x-user-id: u_101' -H 'content-type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"message\":\"Can I order food in Hyderabad?\"}"
```

> [!TIP]
> **If the stream arrives all at once, the problem is usually the client, not the server.** `curl -N`,
> `res.flushHeaders()`, and `X-Accel-Buffering: no` are the three things to check, in that order. §05.9 lists
> buffering as the first production hazard for exactly this reason.

---

### Navigation

- **Previous:** [Chapter 08 — Grounding, RAG & Citations](./08_Grounding_RAG_and_Citations.md)
- **Next:** [Chapter 10 — The Orchestrator: One Message, End to End](./10_The_Orchestrator.md)
- **Notes:** [../../notes/05_Real_Time_Streaming_and_SSE.md](../../../notes/05_Real_Time_Streaming_and_SSE.md)
