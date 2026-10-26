# Chapter 07: Buffered vs Streamed Orchestration

> **Chapter goal:** expose **one** generation loop and **two** ways to consume it — and make the difference
> between the buffered and streamed endpoints visible in a single file. This is the chapter where "the return
> type is the architecture" stops being a slogan.
> **Notes chapters covered:** 01 §01.5 (the same loop, two shapes), 02 §02.2 (the buffered lifecycle),
> 03 §03.5 (the metrics row), 07 §07.1 (`String` buffers), 07 §07.2 (a stream type forwards), 07 §07.4 (the
> tiny streaming service), 07 §07.5 (observers, not terminators), 09 §09.2/§09.3 (the dual write),
> 09 §09.4 (interrupted turns).

---

## 7.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/chat.service.ts` | `LiveTurn` · `prepareTurn` · `runStream` · `toMetrics` · `finaliseTurn` · `interruptTurn` · `streamTurn` · `chatBuffered` |

> This is the orchestrator. It is the only file that knows about **both** the model layer and the persistence
> layer, and it is deliberately the only file that contains the word "buffer".

---

## 7.2 Commands

```bash
npm run typecheck
```

---

## 7.3 `src/services/chat.service.ts` (full file)

```ts
import { randomUUID } from 'node:crypto';
import { PUMP_POLICY, READING_TPS } from '../config/config.js';
import { estimate, providerStream } from '../lib/llm.js';
import type {
  ChatTurn,
  Conversation,
  FinishReason,
  PersistedTurn,
  StreamMetrics,
  Usage,
} from '../types/streaming.types.js';
import { appendUserTurn, loadOrCreate, toMessages, upsertAssistantTurn } from './conversation.service.js';
import { recordStream } from './metrics.service.js';
import { pump, type PumpResult } from './pump.service.js';

/**
 * Chapter 07 §07.4 — the orchestrator.
 *
 * It exposes ONE generation loop (`runStream`) and two ways to consume it:
 * buffered (accumulate) and streamed (forward). Everything that differs between
 * the two is in the caller, exactly as chapter 01 §01.5 claims.
 */

/** Chapter 09 §09.3 — the live state of one turn, created per request. */
export interface LiveTurn {
  conversation: Conversation;
  messageId: string;
  messages: ChatTurn[];
  /** Chapter 09 §09.2 — the buffer lives on the REQUEST, never on the service. */
  buffer: string[];
  /** Chapter 09 §09.5 — filled by the provider at the end of generation. */
  usage: Usage;
  startedAt: number;
  firstTokenAt: number | null;
  lastAt: number;
  gapTotalMs: number;
  deltas: number;
}

/**
 * Chapter 09 §09.3 — record the user turn BEFORE calling the model (durability),
 * and generate the assistant `messageId` before streaming so persistence is
 * idempotent (chapter 09 §09.6).
 */
export const prepareTurn = (conversationId: string, message: string): LiveTurn => {
  const conversation = loadOrCreate(conversationId);
  appendUserTurn(conversation, message);

  return {
    conversation,
    messageId: randomUUID(),
    messages: toMessages(conversation),
    buffer: [],
    usage: { promptTokens: 0, completionTokens: 0 },
    startedAt: Date.now(),
    firstTokenAt: null,
    lastAt: Date.now(),
    gapTotalMs: 0,
    deltas: 0,
  };
};

/**
 * Chapter 07 §07.4 — the streaming service: forward only.
 *
 * The only extra work is the side-channel buffer, which is an *observer* of the
 * stream, not a terminator of it (chapter 07 §07.5): the same delta goes to the
 * client (latency path) and to the buffer (correctness path).
 */
export async function* runStream(turn: LiveTurn, signal?: AbortSignal): AsyncGenerator<string> {
  for await (const delta of providerStream(turn.messages, turn.usage, signal)) {
    const now = Date.now();
    if (turn.firstTokenAt === null) turn.firstTokenAt = now;
    else turn.gapTotalMs += now - turn.lastAt;

    turn.lastAt = now;
    turn.deltas += 1;

    turn.buffer.push(delta); // correctness path — assembled once, at the end
    yield delta; // latency path — forwarded immediately
  }
}

/** Chapter 03 §03.5 — build the row from what the stream actually did. */
const toMetrics = (
  turn: LiveTurn,
  transport: StreamMetrics['transport'],
  finishReason: FinishReason,
  result: { frames: number; chars: number },
): StreamMetrics => {
  const totalMs = Date.now() - turn.startedAt;
  const ttftMs = turn.firstTokenAt === null ? null : turn.firstTokenAt - turn.startedAt;
  const itlMs = turn.deltas > 1 ? Math.round(turn.gapTotalMs / (turn.deltas - 1)) : null;
  const tps = itlMs ? Math.round(1000 / itlMs) : null;

  return {
    at: Date.now(),
    conversationId: turn.conversation.conversationId,
    transport,
    ttftMs,
    itlMs,
    tps,
    totalMs,
    frames: result.frames,
    chars: result.chars,
    charsPerFrame: result.frames ? Math.round(result.chars / result.frames) : 0,
    promptTokens: turn.usage.promptTokens,
    completionTokens: turn.usage.completionTokens || estimate(turn.buffer.join('')),
    finishReason,
    aborted: finishReason === 'aborted',
    fasterThanReading: tps !== null && tps >= READING_TPS,
  };
};

/**
 * Chapter 09 §09.6 — ONE write per exchange, plus the metrics row.
 * Chapter 09 §09.4 — `aborted` is not an error: the partial text is kept and
 * flagged, because the user already read it.
 */
export const finaliseTurn = (
  turn: LiveTurn,
  transport: StreamMetrics['transport'],
  finishReason: FinishReason,
  result: { frames: number; chars: number },
): PersistedTurn => {
  const status = finishReason === 'aborted' ? 'interrupted' : finishReason === 'length' ? 'length' : 'complete';

  const persisted = upsertAssistantTurn(turn.conversation, {
    messageId: turn.messageId,
    content: turn.buffer.join(''), // ⬅ ONE assistant message, not N chunks
    status,
    finishReason,
    usage: turn.usage,
    startedAt: turn.startedAt,
    firstTokenAt: turn.firstTokenAt,
  });

  recordStream(toMetrics(turn, transport, finishReason, result));
  return persisted;
};

/**
 * Chapter 09 §09.4 — the failure hook. A provider error mid-answer must not throw
 * away the text the user already saw.
 */
export const interruptTurn = (
  turn: LiveTurn,
  transport: StreamMetrics['transport'],
  result: { frames: number; chars: number },
): PersistedTurn => finaliseTurn(turn, transport, 'error', result);

/**
 * Chapter 07 §07.6 — pump the stream into a transport-specific writer.
 * The pump owns coalescing and backpressure; the writer owns the framing.
 */
export const streamTurn = async (
  turn: LiveTurn,
  transport: 'raw' | 'sse',
  write: (text: string) => Promise<void>,
  signal?: AbortSignal,
): Promise<{ result: PumpResult; finishReason: FinishReason }> => {
  const result = await pump(write, runStream(turn, signal), PUMP_POLICY, signal);
  const finishReason: FinishReason = signal?.aborted ? 'aborted' : 'stop';

  finaliseTurn(turn, transport, finishReason, result);
  return { result, finishReason };
};

/**
 * Chapter 02 §02.2 / §07.1 — the BUFFERED path.
 *
 * Note how little code this is: it is the same loop, and the accumulator is
 * already there. That is the notes' whole point — the buffered endpoint is not
 * "no chunks exist", it is "someone chose to accumulate them".
 *
 * It is kept here deliberately so the difference between the two endpoints is
 * visible in one file, and so `/api/metrics` shows its `charsPerFrame` — a single
 * enormous frame, which is exactly the buffering smoke alarm from chapter 04 §04.6.
 */
export const chatBuffered = async (
  conversationId: string,
  message: string,
  signal?: AbortSignal,
): Promise<{ turn: LiveTurn; text: string }> => {
  const turn = prepareTurn(conversationId, message);

  for await (const _delta of runStream(turn, signal)) {
    // Intentionally empty: accumulating is what `runStream` already did, and
    // NOTHING is delivered until the loop finishes.
  }

  const text = turn.buffer.join('');
  finaliseTurn(turn, 'buffered', 'stop', { frames: 1, chars: text.length });

  return { turn, text };
};
```

That is the complete file (sections 7.3 and this one together).

---

## 7.4 Block by block

**`LiveTurn` is the per-request state object, and its existence is chapter 09 §09.3.** Everything mutable
about one generation lives here: the buffer, the usage holder, and the timing counters. Nothing of it is on
the service, so two concurrent conversations cannot touch each other's buffer. Compare that with the notes'
`StringBuilder`-as-a-field anti-pattern (chapter 07 §07.8) — that is precisely what this shape avoids.

**`prepareTurn` does four things in the right order.**

| Step | Code | Why this order |
| :--- | :--- | :--- |
| 1 | `loadOrCreate(conversationId)` | get the conversation before touching it |
| 2 | `appendUserTurn(...)` | durability **before** the model call (chapter 09 §09.3) |
| 3 | `toMessages(conversation)` | the prompt must include the new user turn |
| 4 | `randomUUID()` | the assistant `messageId` exists **before** streaming (chapter 09 §09.6) |

Step 4 is the subtle one. Minting the id up front is what makes the later write an *upsert* instead of an
*insert*, which is what makes a retry safe.

**`runStream` is the dual write, in two lines of substance.**

```ts
turn.buffer.push(delta);   // correctness path — assembled once, at the end
yield delta;               // latency path — forwarded immediately
```

Chapter 07 §07.5 calls `doOnNext` an *observer, not a terminator*: it sees each element without stopping the
stream. This is the TypeScript version of exactly that. Note the order: the buffer is appended **before** the
`yield`, so a client that disconnects immediately after receiving a delta still has that delta in the buffer.

The same function also measures the timing, and it is the only place that *can*: it is the only consumer that
sees every delta as it arrives.

```ts
if (turn.firstTokenAt === null) turn.firstTokenAt = now;
else turn.gapTotalMs += now - turn.lastAt;
```

The first delta sets `firstTokenAt` (TTFT); every later delta adds its gap (ITL). Chapter 03 §03.2's formula
`T_total = T_TTFT + (N−1)·T_ITL` is computed here, not guessed anywhere else.

**`toMetrics` turns those counters into the row of chapter 03 §03.5.**

| Field | Formula | Why it is that formula |
| :--- | :--- | :--- |
| `ttftMs` | `firstTokenAt − startedAt` | the user's "is it alive?" number |
| `itlMs` | `gapTotalMs / (deltas − 1)` | inter-token latency needs at least two tokens, hence the guard |
| `tps` | `1000 / itlMs` | chapter 03 §03.3's definition, and the reading-speed comparison |
| `charsPerFrame` | `chars / frames` | the buffering smoke alarm (chapter 04 §04.6) |
| `fasterThanReading` | `tps >= READING_TPS` | labels each row in one boolean |

Note `completionTokens: turn.usage.completionTokens || estimate(...)`. That `||` is the fallback of chapter 09
§09.5: prefer the provider's number, and if it never arrived, estimate — never let a missing usage break the
ledger.

**`finaliseTurn` — the status mapping is the interruption policy.**

```ts
const status = finishReason === 'aborted' ? 'interrupted'
             : finishReason === 'length'  ? 'length'
             : 'complete';
```

Three provider/transport reasons become three storage statuses, so a later read can tell "the model finished",
"the model was cut off by `max_tokens`", and "the user walked away" apart. Chapter 09 §09.4 makes the
interrupted case non-negotiable, and this one line is where the lab honours it.

**`content: turn.buffer.join('')` is the line that prevents the fragmented-history bug.** Everything the
transport did — 18 frames, 34 deltas — collapses to one string here. `upsertAssistantTurn` then writes one
row. This is chapter 09 §09.1 in a single expression.

**`interruptTurn` is a four-line wrapper, and that is the point.** The failure hook is *identical* to the
success hook apart from `finishReason: 'error'`. Chapter 07 §07.5 lists four observers (next/complete/error/
finally); this is the error one, and keeping it a thin alias makes it obvious that the failure path is not an
afterthought.

**`streamTurn` is the only function that knows a transport exists.**

```ts
const result = await pump(write, runStream(turn, signal), PUMP_POLICY, signal);
const finishReason = signal?.aborted ? 'aborted' : 'stop';
```

The pump owns coalescing and backpressure; the writer (supplied by the controller) owns framing. So the service
stays transport-agnostic while still being the place that decides what an abort *means* for persistence.

**`chatBuffered` is six lines, and its emptiness is the lesson.**

```ts
for await (const _delta of runStream(turn, signal)) {
  // Intentionally empty
}
```

There is no `full += delta` here because `runStream` already buffered it — which is exactly the notes' claim
that the buffered endpoint is "the same loop, accumulated". The only thing this function adds is the *decision
not to deliver anything until the loop ends*.

It also records `frames: 1`, which is honest: one response body, one frame. Chapter 04 §04.6's diagnostic table
then flags it immediately — the buffered endpoint shows up with a `charsPerFrame` in the hundreds while the
streamed ones sit in the low tens. The bug you are supposed to notice is visible in production telemetry.

---

## 7.5 The contrast, in one table

| | `chatBuffered` | `streamTurn` |
| :--- | :--- | :--- |
| Return type | `Promise<string>` | `AsyncGenerator<string>` (forwarded) |
| Chapter | 07 §07.1 (`String`) | 07 §07.2 (a stream type) |
| First byte to the client | after the last delta | after the first delta |
| Frames written | 1 | ~deltas/2 (after coalescing) |
| `charsPerFrame` | hundreds | tens |
| What the user waits for | TTFT + all of decode | TTFT |
| Persistence | identical | identical |

The last row is the argument of the whole lecture: **delivery changes; correctness does not.**

---

## 7.6 Verifying this chapter

```bash
# buffered: one value, at the end
curl -s -X POST http://localhost:8097/api/chat -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch07a","message":"hello"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]; print("serverFirstDeltaMs:", d["serverFirstDeltaMs"], "clientSeesTextAtMs:", d["clientSeesTextAtMs"], "deltas:", d["deltasConsumed"])'

# streamed: the same answer, delivered progressively
curl -sN -X POST http://localhost:8097/api/chat/stream -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch07b","message":"hello"}' | head -c 80; echo
```

Expected: `serverFirstDeltaMs: ~276` versus `clientSeesTextAtMs: ~1100`. The server had text after 276 ms and
delivered none of it for another 800 ms. That gap *is* chapter 02 §02.2.

---

**Previous:** [Chapter 06 — Conversation Store & the Dual Write](./06_Conversation_Store_and_the_Dual_Write.md) ·
**Next:** [Chapter 08 — Granularity: Codec & Frame Reassembly](./08_Granularity_Codec_and_Frame_Reassembly.md)
```