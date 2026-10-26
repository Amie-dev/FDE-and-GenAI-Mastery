# Chapter 05: Transports — Raw Text & SSE

> **Chapter goal:** implement the two delivery paths the notes compare, and understand why "streaming" and
> "SSE" are different words. Every header here exists because something in the path — a client, a proxy, a CDN
> — would otherwise break the stream.
> **Notes chapters covered:** 05 §05.1 (conventional vs streaming HTTP), 05 §05.2 (a write is not a flush),
> 05 §05.3.1 (the SSE wire grammar), 05 §05.3.2 (the headers), 05 §05.3.3 (heartbeats), 05 §05.5 (raw text vs
> SSE), 02 §02.4 (`[DONE]`), 07 §07.7 (in-band errors).

---

## 5.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/lib/sse.ts` | `openRawTextStream` · `openSseStream` · `frameEvent` · `sendEvent` · `sendHeartbeat` · `sendDone` · `sendError` |

---

## 5.2 Commands

```bash
npm run typecheck

# the wire, unbuffered — chapter 05 §05.6's first diagnostic
curl -N -X POST http://localhost:8097/api/chat/stream -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch05","message":"hello"}'

curl -N -X POST http://localhost:8097/api/chat/events -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch05b","message":"hello"}'
```

---

## 5.3 `src/lib/sse.ts` (full file)

```ts
import type { Response } from 'express';

/**
 * Chapter 05 — the transports, in one place.
 *
 * Streaming is still HTTP: the same response, with a body written over time and
 * no `Content-Length` (chapter 05 §05.2). Two of the six delivery paths from
 * chapter 02 §02.7 are implemented here — raw text and SSE — because they are the
 * two the notes compare directly.
 *
 * Remember there are TWO protocols stacked here: SSE is the *transport* framing
 * (`event:` / `data:` lines, frames terminated by a blank line), and the JSON
 * inside `data:` is *our* application protocol (chapter 07 §07.7).
 */

/**
 * Chapter 05 §05.1 — raw text streaming: `text/plain`, chunked, nothing to parse.
 * This is the simplest correct choice for a single stream of answer text.
 */
export const openRawTextStream = (res: Response): void => {
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Without this, Nginx accumulates the whole body and streaming vanishes.
    'X-Accel-Buffering': 'no',
  });
  // The status commits on first write, so headers go out NOW.
  res.flushHeaders?.();
};

/** Chapter 05 §05.3.2 — every header that matters for SSE. */
export const openSseStream = (res: Response): void => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  // Makes the browser's fetch() promise resolve immediately, so the UI can show "streaming".
  res.flushHeaders?.();
};

/**
 * Chapter 05 §05.3.1 — the wire grammar: `field: value` lines, then a blank line
 * that DISPATCHES the event. Exported as a pure function so the pump can write
 * frames without knowing the format.
 */
export const frameEvent = (event: string, data: unknown): string =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export const sendEvent = (res: Response, event: string, data: unknown): void => {
  res.write(frameEvent(event, data));
};

/**
 * Chapter 05 §05.3.3 — a comment frame. The client ignores it; idle-connection
 * timeouts do not. Only SSE can carry a no-op: in raw text every byte is payload,
 * so a whitespace heartbeat would corrupt the answer.
 */
export const sendHeartbeat = (res: Response): void => {
  res.write(': keep-alive\n\n');
};

/** Chapter 02 §02.4 — the sentinel that gives the client an unambiguous completion signal. */
export const sendDone = (res: Response): void => {
  res.write('data: [DONE]\n\n');
  res.end();
};

/**
 * Chapter 07 §07.7 — after the first byte an error cannot become a 500, so typed
 * errors travel *inside* the stream.
 */
export const sendError = (res: Response, code: string, message: string): void => {
  sendEvent(res, 'error', { code, message, recoverable: false });
  sendDone(res);
};
```

---

## 5.4 Block by block

**Two openers, four headers each, and every header is load-bearing.**

| Header | What breaks without it | Chapter |
| :--- | :--- | :--- |
| `Content-Type` | raw text would be sniffed/rewritten; SSE would not be recognised as an event stream at all | 05 §05.1, §05.3.2 |
| `charset=utf-8` | multi-byte answers arrive as mojibake even when your decoding is perfect | 04 §04.4 |
| `Cache-Control: no-cache, no-transform` | a cache or a middlebox stores the body, or "helpfully" re-encodes it and destroys the framing | 05 §05.3.2 |
| `Connection: keep-alive` | the connection closes between chunks | 05 §05.2 |
| `X-Accel-Buffering: no` | **Nginx buffers 4–16 KB before forwarding** — the user sees a stall, then a burst | 05 §05.6 |

**`res.flushHeaders?.()` — chapter 05 §05.2 in one call.** The optional call is defensive: it exists on
`http.ServerResponse`, but a test double or a different adapter may not have it. Its effect is what matters:
the `200 OK` and the headers leave the socket *now*, before any token exists. That has two consequences worth
stating:

1. the client's `fetch()` promise resolves immediately, so the UI can switch to a "streaming" state;
2. **the status is now frozen** — every subsequent failure must be signalled in-band (chapter 07 §07.7).

**`frameEvent` is a pure function, and that is deliberate.** The pump needs to write SSE frames without
importing any SSE knowledge (chapter 04 §4.5). Returning a string — rather than writing to `res` — lets the
controller compose it with the backpressure helper:

```ts
(text) => writeWithBackpressure(res, frameEvent('token', { text }))
```

Note the exact grammar: `field: value`, one field per line, and **a blank line that dispatches the event**.
Forgetting the second `\n` is the classic bug — the client receives bytes but no event.

**`sendHeartbeat` writes `: keep-alive\n\n`, a *comment* frame.** The leading colon is the SSE comment marker;
a conforming parser ignores the frame entirely. That is the whole point (chapter 05 §05.3.3): a heartbeat must
be invisible to the application protocol but visible to every idle timeout between the server and the browser.
It only works on SSE, and the code says so — in raw text there is no comment syntax, so a heartbeat byte would
land in the middle of the answer.

**`sendDone` writes `data: [DONE]\n\n` and ends the response.** Chapter 02 §02.4 lists the sentinel as the
unambiguous completion signal. Note it is a *bare* `data:` line with no `event:` field, matching the
OpenAI-style convention that clients already special-case. Our own client skips it explicitly — the sentinel
is not text.

**`sendError` is the in-band error path of chapter 07 §07.7.** It emits a typed `error` event and then a normal
`done`, so the client's state machine ends in the same place whether the stream succeeded or failed. The
`recoverable: false` field is the hook a retry policy would read later.

---

## 5.5 Why both transports exist in the same file

Chapter 05 §05.5 draws the distinction that trips people up:

```text
Streaming = data arrives progressively
SSE       = one particular protocol/format for delivering events
```

Keeping `openRawTextStream` and `openSseStream` side by side makes the difference concrete: **four identical
headers, one different `Content-Type`, and a completely different body grammar.** Raw text has no frames, no
event names and no sentinel — you append whatever arrives. SSE can carry `status`, `token`, `usage`, `error`
and `done` in one connection, which is why chapter 07 §07.7's in-band protocol needs it.

The lab's `/api/chat/stream` and `/api/chat/events` endpoints are the same service with a different opener and
a different writer, which is exactly the "one bridge, two sinks" shape of chapter 06 §06.1.

---

## 5.6 Verifying this chapter

```bash
# Raw text: headers + progressive bytes, no framing
curl -sN -D - -o /tmp/raw.txt -X POST http://localhost:8097/api/chat/stream \
  -H 'Content-Type: application/json' -d '{"conversationId":"ch05","message":"hello"}' | head -8

# SSE: headers + framed events, ending with the sentinel
curl -sN -X POST http://localhost:8097/api/chat/events \
  -H 'Content-Type: application/json' -d '{"conversationId":"ch05b","message":"hello"}' \
  | grep -E '^(event|data)' | head -8
```

Expected in the first output: `HTTP/1.1 200 OK`, `Content-Type: text/plain; charset=utf-8`,
`Transfer-Encoding: chunked`, and **no `Content-Length`** — chapter 05 §05.2, visible on the wire.

Expected in the second: `event: status`, then repeated `event: token` / `data: {"text":"…"}`, then
`event: usage`, `event: done`, and finally `data: [DONE]`.

---

**Previous:** [Chapter 04 — The Stream Pump](./04_The_Stream_Pump_Coalescing_and_Backpressure.md) ·
**Next:** [Chapter 06 — Conversation Store & the Dual Write](./06_Conversation_Store_and_the_Dual_Write.md)