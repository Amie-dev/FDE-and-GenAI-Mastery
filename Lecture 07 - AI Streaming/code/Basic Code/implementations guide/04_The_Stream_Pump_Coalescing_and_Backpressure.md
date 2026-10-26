# Chapter 04: The Stream Pump — Coalescing & Backpressure

> **Chapter goal:** own the two delivery decisions that belong to the application — how often to flush, and
> what to do when the socket says "slow down". This is the file that turns "we set `stream: true`" into "the
> bytes actually arrive progressively".
> **Notes chapters covered:** 06 §06.1 (the bridge between the two streams), 06 §06.5 (backpressure is usually
> a UI problem), 07 §07.6 (stream pumps, delta coalescing, backend backpressure), 03 §03.3 (why coalescing is
> free).

---

## 4.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/pump.service.ts` | `pump` (the coalescing loop) · `writeWithBackpressure` · `PumpOptions` · `PumpResult` |

---

## 4.2 Commands

```bash
npm run typecheck
curl -s http://localhost:8097/api/metrics | python3 -m json.tool | head -20
```

---

## 4.3 `src/services/pump.service.ts` (full file)

```ts
import { once } from 'node:events';
import type { Response } from 'express';

/**
 * Chapter 07 §07.6 — the stream pump.
 *
 * This is the small piece of code that moves provider deltas into the HTTP
 * response, and it owns the two delivery decisions the notes call out:
 *
 *   1. COALESCING — flush on a time OR size threshold, but never delay the first
 *      piece (TTFT is the metric the user feels).
 *   2. BACKPRESSURE — a write is not a flush, and `res.write()` can say "slow down".
 *
 * Chapter 06 §06.1 — this is the bridge between Stream A and Stream B. It must
 * forward, not accumulate: the only thing it keeps is the tail that has not been
 * flushed yet.
 */

export interface PumpOptions {
  flushIntervalMs: number;
  flushBytes: number;
}

export interface PumpResult {
  /** Frames actually written to the socket — NOT the number of deltas. */
  frames: number;
  /** Characters forwarded, which is the count the UI cares about. */
  chars: number;
  firstAt: number | null;
  endedAt: number;
}

/**
 * Chapter 07 §07.6 — never ignore the backpressure signal.
 * Ignoring it grows the response buffer, clumps delivery, and lets one slow
 * client pin memory on the server.
 *
 * Chapter 06 §06.6 — but a "wait for drain" that only listens for `drain` LEAKS
 * when the client disappears: the socket is gone, `drain` never fires, and the
 * stream never cleans up. So we race `drain` against `close`. (This lab's own
 * cancellation test caught exactly that — see the guide.)
 */
export const writeWithBackpressure = async (res: Response, text: string): Promise<void> => {
  if (res.writableEnded || res.destroyed) return; // the client is already gone

  const ok = res.write(text);
  if (!ok) await Promise.race([once(res, 'drain'), once(res, 'close')]);
};

/**
 * Chapter 07 §07.6 — the coalescing pump.
 *
 * `write` is the transport-specific sink (a raw write, or an SSE frame), so the
 * policy lives here and the framing lives in `lib/sse.ts`.
 */
export const pump = async (
  write: (text: string) => Promise<void>,
  deltas: AsyncIterable<string>,
  options: PumpOptions,
  signal?: AbortSignal,
): Promise<PumpResult> => {
  const startedAt = Date.now();

  // Serialize the writes so a timer flush and a size flush can never interleave.
  let chain: Promise<void> = Promise.resolve();
  const enqueue = (text: string): Promise<void> => {
    chain = chain.then(() => write(text));
    return chain;
  };

  let pending = '';
  let frames = 0;
  let chars = 0;
  let firstAt: number | null = null;
  let timer: NodeJS.Timeout | null = null;

  const flush = async (): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;

    const text = pending;
    pending = '';
    frames += 1;
    await enqueue(text);
  };

  const schedule = (): void => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, options.flushIntervalMs);
  };

  for await (const delta of deltas) {
    // Chapter 06 §06.6 — the client left, so stop forwarding and stop paying.
    if (signal?.aborted) break;

    chars += delta.length;
    pending += delta;

    if (firstAt === null) {
      // The first piece is flushed immediately: a "flush on timer only" pump that
      // waits 40 ms before the first token is a self-inflicted TTFT regression.
      firstAt = Date.now();
      await flush();
      continue;
    }

    if (pending.length >= options.flushBytes) await flush();
    else schedule();
  }

  await flush(); // never leave a tail unflushed
  await chain; // drain the serialized writer

  return { frames, chars, firstAt, endedAt: Date.now() };
};
```

---

## 4.4 Block by block

**The two responsibilities, stated up front.** The header comment names them so a reader knows what to look
for: *coalescing* (when to write) and *backpressure* (whether we are allowed to). Everything else in the file
is bookkeeping.

**`writeWithBackpressure` — the guard clause is the fix for a real leak.** The first version of this function
was:

```ts
const ok = res.write(text);
if (!ok) await once(res, 'drain');
```

It looked correct, and it hung forever. When the client disconnects mid-stream, the socket is destroyed, the
write buffer never drains, and `once(res, 'drain')` never resolves — so the pump never returns, the `finally`
block in the controller never runs, and the stream is never cleaned up. The lab's own cancellation test found
it: `/api/metrics` reported `activeStreams: 1` with `streams: 0`, i.e. a stream that existed but had never
finished.

The fix is three lines:

| Line | Why |
| :--- | :--- |
| `if (res.writableEnded \|\| res.destroyed) return;` | don't even try to write to a dead socket |
| `const ok = res.write(text);` | `write()` returns `false` when the internal buffer is full |
| `await Promise.race([once(res, 'drain'), once(res, 'close')]);` | wait for **either** "you may write again" **or** "the client is gone" |

This is exactly the lecture's completion gate — *cancel it mid-flight without leaking the connection* — and it
is worth internalising that the naive version passes every happy-path test.

**The serialized writer (`chain` + `enqueue`) solves a subtler bug.** Two things can flush: the timer
callback and the size check inside the loop. The timer callback cannot `await`, so without serialization a
timer flush and a size flush could interleave two `res.write()` calls and produce out-of-order frames. Chaining
every write onto one promise makes the ordering a property of the code rather than of timing:

```ts
chain = chain.then(() => write(text));
```

Note that `flush()` awaits `enqueue(...)`, which awaits the *whole chain*, not just its own write. That is
what makes `await flush()` a real "this piece is on the wire" guarantee, which the TTFT measurement depends
on.

**`pending` is the only buffer in the file, and it is bounded.** It holds the unflushed tail — never more than
`flushBytes` plus one delta. Chapter 06 §06.1 says the backend must be a bridge, not a buffer; this is what
"bridge" costs: one small variable.

**The first piece is flushed immediately, and the `continue` is the point.** Chapter 07 §07.6 lists this as a
pitfall: a pump that flushes only on a 40 ms timer adds 40 ms to TTFT for no benefit. The `continue` also
prevents the size check from running on the first delta, so the very first write is always one frame.

**`if (signal?.aborted) break;` is where cancellation becomes real.** The pump is the *only* consumer of the
generator, so breaking here stops `providerStream` from being pulled again — the upstream generation is
abandoned rather than merely ignored (chapter 06 §06.6).

**`await flush(); await chain;` — the tail.** Two distinct duties: flush whatever is still pending (a short
answer may never have hit `flushBytes` or the timer), and then wait for the *serialized chain* to finish.
Skipping the second await means the function can return before the last frame is written, and the controller
would send `done` before the final `token`. That ordering bug is invisible in a fast local test and obvious in
production.

**`PumpResult` reports `frames`, not `deltas`.** That distinction is the whole metric: 34 deltas delivered as
18 frames is a healthy stream; 34 deltas delivered as 1 frame is a buffering bug (chapter 04 §04.6). The
`chars` field is counted from the *deltas* (`chars += delta.length`) while `frames` is counted from the
*writes*, which is what makes `chars ÷ frames` meaningful.

---

## 4.5 Why the pump is transport-agnostic

The pump never imports `express`'s response for anything except the backpressure helper, and it never knows
whether a frame is raw text or an SSE event. The controller supplies that:

```ts
const write =
  transport === 'sse'
    ? (text: string) => writeWithBackpressure(res, frameEvent('token', { text }))
    : (text: string) => writeWithBackpressure(res, text);
```

So the same coalescing policy, the same cancellation check, and the same tail-flush logic serve both
transports. When you later add a third (a WebSocket sink, say), the pump does not change — only the writer
does. That is the practical payoff of the notes' insistence that *streaming is not SSE*.

---

## 4.6 Verifying this chapter

```bash
# 34 deltas, ~18 frames, charsPerFrame in the low tens — a healthy stream
curl -sN -X POST http://localhost:8097/api/chat/stream \
  -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch04","message":"hello"}' > /tmp/raw.txt
curl -s http://localhost:8097/api/metrics | python3 -m json.tool | grep -A9 lastStream

# Now the buffered endpoint — same answer, ONE frame, charsPerFrame in the hundreds
curl -s -X POST http://localhost:8097/api/chat \
  -H 'Content-Type: application/json' -d '{"conversationId":"ch04b","message":"hello"}' > /dev/null
curl -s http://localhost:8097/api/metrics | python3 -m json.tool | grep -A9 lastStream
```

Compare `"transport": "raw", "frames": 18` with `"transport": "buffered", "frames": 1`. The second one is what
a broken streaming pipeline looks like from the outside — and it is why `charsPerFrame` is a first-class metric
rather than a curiosity.

---

**Previous:** [Chapter 03 — The Model Layer](./03_The_Model_Layer_Generation_vs_Delivery.md) ·
**Next:** [Chapter 05 — Transports: Raw Text & SSE](./05_Transports_Raw_Text_and_SSE.md)