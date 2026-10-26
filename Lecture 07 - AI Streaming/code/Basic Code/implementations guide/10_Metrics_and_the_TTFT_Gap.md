# Chapter 10: Metrics & the TTFT Gap

> **Chapter goal:** instrument the stream with the numbers chapter 03 §03.5 demands, and expose the server half
> of the one alert chapter 09 §09.8 says is worth having. A buffered endpoint and a broken-streaming endpoint
> look identical in an aggregate latency dashboard — this file is the difference.
> **Notes chapters covered:** 03 §03.3 (reading speed), 03 §03.5 (the numbers you must log), 04 §04.6
> (`charsPerChunk` as a diagnostic), 09 §09.7 item 21 (active streams), 09 §09.8 (metrics + the TTFT gap).

---

## 10.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/metrics.service.ts` | `beginStream` · `endStream` · `activeStreams` · `recordStream` · `percentile` · `metricsSummary` |

---

## 10.2 Commands

```bash
npm run typecheck
curl -s http://localhost:8097/api/metrics | python3 -m json.tool
```

---

## 10.3 `src/services/metrics.service.ts` (full file)

```ts
import { READING_TPS } from '../config/config.js';
import type { FinishReason, StreamMetrics } from '../types/streaming.types.js';

/**
 * Chapter 03 §03.5 — the numbers you must log.
 *
 * A buffered endpoint and a broken-streaming endpoint look IDENTICAL in an
 * aggregate latency dashboard, so one total number is diagnostically useless.
 * This service keeps a bounded in-memory ledger of per-stream rows.
 *
 * Chapter 09 §09.8 — in production this is one structured log line per stream
 * (plus a p95 alert). Here it is an endpoint you can read.
 */

const LEDGER_LIMIT = 500;
const ledger: StreamMetrics[] = [];

/** Chapter 09 §09.7 item 21 — in-flight streams, so shutdown can drain them. */
let active = 0;
let aborted = 0;

export const beginStream = (): void => {
  active += 1;
};

export const endStream = (): void => {
  active = Math.max(0, active - 1);
};

export const activeStreams = (): number => active;

export const recordStream = (metrics: StreamMetrics): void => {
  if (metrics.aborted) aborted += 1;
  ledger.push(metrics);
  if (ledger.length > LEDGER_LIMIT) ledger.shift();
};

/** Nearest-rank percentile over a sorted copy. */
const percentile = (values: number[], p: number): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)] ?? null;
};

const mean = (values: number[]): number | null =>
  values.length === 0 ? null : Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1));

/**
 * Chapter 09 §09.8 — the streaming-specific metrics that detect regressions.
 * Note what is missing: a client-side TTFT. Only the browser knows it, which is
 * why the TTFT *gap* is the one alert worth having (see `public/index.html`).
 */
export const metricsSummary = () => {
  const ttfts = ledger.map((row) => row.ttftMs).filter((value): value is number => value !== null);
  const itls = ledger.map((row) => row.itlMs).filter((value): value is number => value !== null);
  const tpss = ledger.map((row) => row.tps).filter((value): value is number => value !== null);

  const byFinishReason = ledger.reduce<Record<FinishReason, number>>(
    (counts, row) => ({ ...counts, [row.finishReason]: (counts[row.finishReason] ?? 0) + 1 }),
    { stop: 0, length: 0, error: 0, aborted: 0 },
  );

  return {
    streams: ledger.length,
    activeStreams: active,
    abortedStreams: aborted,
    abortRate: ledger.length ? Number((aborted / ledger.length).toFixed(2)) : 0,
    byFinishReason,
    ttftMs: { p50: percentile(ttfts, 50), p95: percentile(ttfts, 95) },
    itlMs: mean(itls),
    tps: mean(tpss),
    /** Chapter 03 §03.3 — above reading speed, more TPS buys the user nothing. */
    readingSpeedTps: READING_TPS,
    fasterThanReadingRate: ledger.length
      ? Number((ledger.filter((row) => row.fasterThanReading).length / ledger.length).toFixed(2))
      : 0,
    /**
     * Chapter 04 §04.6 — the buffering smoke alarm.
     * A narrow distribution of small frames is healthy; one giant frame is not.
     */
    charsPerFrame: {
      avg: mean(ledger.map((row) => row.charsPerFrame)),
      p95: percentile(ledger.map((row) => row.charsPerFrame), 95),
    },
    lastStream: ledger[ledger.length - 1] ?? null,
  };
};
```

---

## 10.4 Block by block

**The ledger is bounded, and the bound is a design decision.** `LEDGER_LIMIT = 500` with `shift()` on overflow
means memory is flat and the endpoint always answers. Chapter 09 §09.8 asks for "one structured log line per
stream" in production; a bounded ring is the in-process version of that, and the important property — *never
grow without limit inside a request path* — is preserved.

**`active` and `aborted` are counters, not derivations, and they answer different questions.**

| Counter | Incremented by | Read by | Answers |
| :--- | :--- | :--- | :--- |
| `active` | `beginStream` / `endStream` in the controller | `/api/health`, `/api/metrics`, `server.ts` | "is anything in flight right now?" |
| `aborted` | `recordStream` when `metrics.aborted` | `/api/metrics` | "how often do users walk away?" |

`active` is the one `server.ts` polls during shutdown — chapter 09 §09.7 item 21 (drain in-flight streams). That
is why `endStream()` uses `Math.max(0, active - 1)`: a shutdown race must never be able to drive the counter
negative and make the drain loop exit early.

**`percentile` is nearest-rank, and the `Math.max(0, index)` guard is not paranoia.** With one sample and
`p = 95`, `Math.ceil(0.95 × 1) − 1 = 0`, so the index is fine — but the guard plus the early `return null` for an
empty input means the function is total: it never throws and never returns `undefined` where a number is
expected.

> **Why percentiles at all, with a handful of samples?** Because chapter 09 §09.8 is explicit that "streaming
> bugs are statistical (p95 tails), not average-case — averages hide them entirely". Reporting `p50` next to
> `p95` from the first run onward establishes the habit; the numbers get meaningful as the ledger fills.

**`byFinishReason` is a `Record<FinishReason, number>` seeded with all four keys.**

```ts
ledger.reduce<Record<FinishReason, number>>(
  (counts, row) => ({ ...counts, [row.finishReason]: (counts[row.finishReason] ?? 0) + 1 }),
  { stop: 0, length: 0, error: 0, aborted: 0 },
)
```

Seeding all four keys matters: a dashboard that only shows reasons that have occurred cannot show that `error`
and `aborted` are *zero*, and "zero errors" is information. The `?? 0` is belt-and-braces for a future
`FinishReason` that has not been added to the seed.

**`ttftMs` filters out `null` before computing percentiles.**

```ts
const ttfts = ledger.map((row) => row.ttftMs).filter((value): value is number => value !== null);
```

A stream that produced no token has no TTFT. Including `null` would require a sentinel (usually `0`), and a `0`
in a latency percentile is a lie that drags the average down and hides a real problem. The type predicate
(`value is number`) is what lets TypeScript accept the filtered array as `number[]`.

**`fasterThanReadingRate` is the metric that stops a pointless purchase.** Chapter 03 §03.3's point is that TPS
above ~8 tokens/s buys the user nothing. If this rate is `1.0`, then paying for a faster tier to improve TPS is
wasted money, and the next investment belongs in TTFT or rendering. One number, one decision.

**`charsPerFrame` is the buffering smoke alarm, and it is the only metric here with no analogue in buffered
systems.** Chapter 04 §04.6's table:

| `charsPerFrame` | Meaning |
| :--- | :--- |
| ≈ 1–3 | provider streaming at fine granularity (or a per-byte decoder) |
| ≈ 5–40 | normal cadence — **this lab's healthy stream** |
| hundreds every ~1 s | **someone is buffering and flushing periodically** |
| one frame, then done | streaming is broken somewhere |

The lab's buffered endpoint produces exactly the third and fourth rows, so the alarm is demonstrable rather than
theoretical.

**`lastStream` exists so a single curl can explain what just happened.** `metricsSummary` gives the aggregate;
`lastStream` gives the row for the request you just made. That is what makes `/api/metrics` usable as a
debugging tool without a metrics backend.

---

## 10.5 The TTFT gap — why the server cannot compute it

Chapter 03 §03.5's most valuable measurement is a **difference**, not a value:

```text
gap = clientTTFT − serverTTFT
```

and this file deliberately does **not** compute it. The reason is structural: `serverTTFT` is measured in
`chat.service.ts` (request received → first delta), while `clientTTFT` is measured in the browser (click → first
painted character). The server has no way to observe the second one — it never sees the paint.

So the split is:

| Half | Measured in | Transported by |
| :--- | :--- | :--- |
| `serverTTFT` | `runStream` → `toMetrics` → the `done` event | the SSE `done` payload |
| `clientTTFT` | `performance.now() − startedAt` in `public/index.html` | nothing — it stays in the browser |
| the gap | `public/index.html`'s `report()` | shown in the HUD |

This is why the `done` event carries `ttftMs` at all: the client needs the server's number to compute the
difference. Chapter 09 §09.8's alert — `p95(clientTTFT − serverTTFT) > 500 ms` — is only expressible because
both halves are recorded in the same place: the client.

**What a large gap means, and what it does not.** A large gap says the delay is *after* the provider: proxy
buffering, compression, a middleware that reads the body, or a render-blocking client. It says nothing about
model speed. That is the whole diagnostic value — it separates the two halves of the pipeline that a single
total-latency number conflates.

---

## 10.6 Verifying this chapter

```bash
# a healthy stream, then the aggregate
curl -sN -X POST http://localhost:8097/api/chat/stream -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch10a","message":"hello"}' > /dev/null
curl -s http://localhost:8097/api/metrics | python3 -c '
import json,sys
d = json.load(sys.stdin)["data"]
print("streams:", d["streams"], "| active:", d["activeStreams"], "| abortRate:", d["abortRate"])
print("TTFT p50/p95:", d["ttftMs"], "| ITL:", d["itlMs"], "| TPS:", d["tps"])
print("fasterThanReadingRate:", d["fasterThanReadingRate"], "(readingSpeedTps:", d["readingSpeedTps"], ")")
print("charsPerFrame avg/p95:", d["charsPerFrame"])
print("lastStream:", d["lastStream"]["transport"], "frames:", d["lastStream"]["frames"])
'

# now the buffered endpoint, and watch charsPerFrame jump
curl -s -X POST http://localhost:8097/api/chat -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch10b","message":"hello"}' > /dev/null
curl -s http://localhost:8097/api/metrics | python3 -c '
import json,sys
d = json.load(sys.stdin)["data"]["lastStream"]
print("lastStream:", d["transport"], "frames:", d["frames"], "charsPerFrame:", d["charsPerFrame"])
'
```

Expected: the streamed row shows `transport raw, frames ~18, charsPerFrame ~12`; the buffered row shows
`transport buffered, frames 1, charsPerFrame ~217`. Same answer, same persistence, completely different delivery
signature — and the alarm fires on the second one.

---

**Previous:** [Chapter 09 — The Fragmentation Torture Test](./09_The_Fragmentation_Torture_Test.md) ·
**Next:** [Chapter 11 — Validation, Controllers & Routes](./11_Validation_Controllers_and_Routes.md)