# Chapter 09: The Fragmentation Torture Test

> **Chapter goal:** turn "our client is transport-independent" from a claim into an assertion. Feed the same
> payload at every hostile fragmentation size, both as raw text and as SSE, and prove the accumulated text never
> changes.
> **Notes chapters covered:** 04 §04.6 (the torture test and the `charsPerChunk` diagnostic), 08 §08.5 (the
> client read loop), 08 §08.6 (one decoder, flushed), 09 §09.10 (the two CI assertions).

---

## 9.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/codec.service.ts` (part 2) | `clientConsume` · `decodeReport` · `frameReport` · `torture` |
| `src/controllers/codec.controller.ts` | `postDecode` · `postFrames` · `postTorture` |

---

## 9.2 Commands

```bash
npm run typecheck

curl -s -X POST http://localhost:8097/api/codec/torture -H 'Content-Type: application/json' \
  -d '{"text":"Spring ₹500 café naïve 日本語 😀","seed":42}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]; print("all ok:", d["ok"]); [print(f"  {c[\"strategy\"]:20} {c[\"mode\"]:4} chunks={c[\"chunks\"]:3} ok={c[\"ok\"]}") for c in d["cases"]]'
```

---

## 9.3 `src/services/codec.service.ts` — part 2 (full)

```ts
/**
 * Chapter 08 §08.5 — the whole client algorithm, in one function.
 *
 * Read bytes → decode with ONE streaming decoder → (optionally) reassemble frames
 * with a leftover buffer → append to ONE accumulator. If this returns the payload
 * unchanged for every fragmentation strategy, the client is transport-independent
 * (chapter 04 §04.6).
 */
export const clientConsume = (chunks: Uint8Array[], mode: 'raw' | 'sse'): string => {
  const decoder = new TextDecoder('utf-8');
  let leftover = '';
  let accumulated = '';

  const absorb = (piece: string): void => {
    if (mode === 'raw') {
      accumulated += piece; // chapter 04 §04.5 — blind accumulation
      return;
    }
    const parsed = reassembleFrames(piece, leftover);
    leftover = parsed.leftover;
    accumulated += parsed.texts.join('');
  };

  for (const chunk of chunks) {
    absorb(decoder.decode(chunk, { stream: true }));
  }
  absorb(decoder.decode()); // ⬅ the flush: without it the last character is lost

  return accumulated;
};

/** Chapter 04 §04.4 — the endpoint payload: naive vs streaming decode, side by side. */
export const decodeReport = (payload: string, chunkSize: FragmentMode): DecodeReport => {
  const bytes = new TextEncoder().encode(payload);
  const chunks = fragment(bytes, chunkSize);
  const naive = decodeNaive(chunks);
  const streaming = decodeStreaming(chunks);

  return {
    payload,
    byteLength: bytes.length,
    chunks: chunks.length,
    naive,
    streaming,
    naiveIsCorrect: naive === payload,
    streamingIsCorrect: streaming === payload,
  };
};

/** Chapter 04 §04.3/§04.5 — the correct parser vs the naive one, over the same bytes. */
export const frameReport = (payload: string, chunkSize: FragmentMode): FrameReport => {
  const body = toSseBody(payload);
  const chunks = fragment(new TextEncoder().encode(body), chunkSize);
  const decoder = new TextDecoder('utf-8');

  let leftover = '';
  let frames = 0;
  let text = '';
  let naiveFrames = 0;
  let naiveText = '';

  for (const chunk of chunks) {
    const piece = decoder.decode(chunk, { stream: true });

    const parsed = reassembleFrames(piece, leftover);
    leftover = parsed.leftover;
    frames += parsed.frames.length;
    text += parsed.texts.join('');

    const naive = reassembleNaive(piece);
    naiveFrames += naive.frames;
    naiveText += naive.text;
  }

  const tail = reassembleFrames(decoder.decode(), leftover);
  frames += tail.frames.length;
  text += tail.texts.join('');

  return {
    payload,
    chunks: chunks.length,
    correct: { frames, text, leftover: tail.leftover },
    naive: { frames: naiveFrames, text: naiveText },
    equal: text === payload,
  };
};

/**
 * Chapter 04 §04.6 / chapter 09 §09.10 — the fragmentation torture test.
 *
 * Chapter 09 §09.10 puts two assertions in CI; this is the second one. If the
 * accumulated text changes with the fragmentation size, the client has a bug —
 * and it is a bug that will only appear on someone else's network.
 */
export const torture = (payload: string, seed = 42): TortureReport => {
  const strategies: Array<{ name: string; mode: FragmentMode }> = [
    { name: 'whole-body', mode: 'whole' },
    { name: 'per-character', mode: 'char' },
    { name: 'per-byte', mode: 'byte' },
    { name: 'random-1-64-bytes', mode: 'random' },
    { name: 'newline-aligned', mode: 'newline' },
  ];

  const cases: TortureCase[] = [];

  for (const strategy of strategies) {
    for (const mode of ['raw', 'sse'] as const) {
      const body = mode === 'sse' ? toSseBody(payload) : payload;
      const chunks = fragment(new TextEncoder().encode(body), strategy.mode, seed);
      const actual = clientConsume(chunks, mode);

      cases.push({
        strategy: strategy.name,
        mode,
        chunks: chunks.length,
        ok: actual === payload,
        actual,
        expected: payload,
      });
    }
  }

  return { payload, cases, ok: cases.every((row) => row.ok) };
};
```

---

## 9.4 Block by block — `clientConsume`

**`clientConsume` is the browser client, minus the DOM.** It is the server-side twin of `absorb()` in
`public/index.html`, and it exists so the algorithm can be asserted rather than eyeballed. Chapter 08 §08.5
describes exactly this loop: read bytes → decode → accumulate. The only difference from the browser is that the
chunks arrive as an array instead of from a `ReadableStream` reader.

**`absorb` closes over `leftover` and `accumulated`, and the two modes are one `if` apart.**

```ts
if (mode === 'raw') { accumulated += piece; return; }          // chapter 04 §04.5
const parsed = reassembleFrames(piece, leftover);              // chapter 04 §04.3
leftover = parsed.leftover;
accumulated += parsed.texts.join('');
```

That is the entire difference between consuming raw text and consuming SSE: raw text *is* the payload, so blind
accumulation is correct; SSE has a transport layer, so the payload must be extracted first. Both paths decode
identically, which is the point — **the codec is transport-agnostic, the framing is not.**

**The flush is called through the same `absorb`, and that is deliberate.**

```ts
for (const chunk of chunks) absorb(decoder.decode(chunk, { stream: true }));
absorb(decoder.decode());   // ⬅ the flush
```

Routing the flush through `absorb` means the last, incomplete frame also gets reassembled — in SSE mode a stream
can legitimately end without a trailing blank line, and a client that only flushed the *decoder* would still lose
that final frame. One code path, both tails handled.

---

## 9.5 Block by block — the two reports and the test

**`decodeReport` compares the two decoders over the same bytes.**

| Field | Purpose |
| :--- | :--- |
| `byteLength` | proves the payload really is multi-byte (17 bytes for 11 characters) |
| `chunks` | how many pieces the strategy produced |
| `naive` / `streaming` | the two outputs, side by side, so the corruption is visible |
| `naiveIsCorrect` / `streamingIsCorrect` | the assertions, as booleans, so a script can check them |

Returning the *outputs* as well as the booleans matters for teaching: `"500 caf"` next to `"₹500 café 😀"`
communicates the failure better than `false` ever could.

**`frameReport` runs both parsers over the identical byte stream.** That is the only way to attribute the
failure. If the naive parser were fed a *different* fragmentation, you could not tell whether it failed because
of the missing leftover buffer or because of bad luck. Feeding both the same `chunks` makes the single-line
difference (`parts.pop()`) the only variable.

Note the flush is handled explicitly here (rather than through a helper), and the tail frame is appended to the
totals:

```ts
const tail = reassembleFrames(decoder.decode(), leftover);
frames += tail.frames.length;
text += tail.texts.join('');
```

Skipping that would make a *correct* parser look wrong whenever the last frame arrived in the last chunk — a
false negative that would send you hunting for a bug in the right code.

**`torture` is a nested loop, and the nesting is the design.**

```ts
for (const strategy of strategies) {
  for (const mode of ['raw', 'sse'] as const) {
```

| Loop | Iterates over | Chapter |
| :--- | :--- | :--- |
| outer | fragmentation strategy (5) | 04 §04.6 |
| inner | transport (`raw`, `sse`) | 05 §05.5 |

Five strategies × two transports = **ten cases**, which is why the endpoint reports ten rows. Testing only raw
mode would miss the frame parser entirely; testing only SSE would hide whether a failure came from decoding or
from framing. The cross-product is what makes a failure diagnostic.

**`ok: cases.every((row) => row.ok)` is the CI assertion of chapter 09 §09.10, made into a return value.** The
controller turns it into a status code, so `POST /api/codec/torture` is not just a report — it is a test you can
run from a pipeline, and a non-zero status is a failing build.

**Each case carries `actual` and `expected`, not just a boolean.** When a case fails, the payload is in the
response. Chapter 04 §04.6's whole argument is that these bugs are invisible until they are not; a report that
says "case 6 failed" without showing *what* came out is a report you cannot act on.

---

## 9.6 The five strategies, and what each one proves

| Strategy | What it proves | What a failure means |
| :--- | :--- | :--- |
| `whole-body` | the control case | a parsing bug, not a fragmentation bug |
| `per-byte` | the harshest realistic case | a per-chunk decoder, or a missing flush, or a missing leftover buffer |
| `per-character` | the bug is about *bytes* | if this fails while `per-byte` passes, something else is wrong entirely |
| `random-1-64-bytes` | the real world | a bug that only shows up "sometimes" — the worst kind |
| `newline-aligned` | the coincidentally-safe case | a frame parser that works by luck, because boundaries happen to line up |

The pair worth running first is `whole-body` **passing** and `per-byte` **failing**. That combination says: the
framing is right, the *decoding* is wrong — go straight to `decodeStreaming`.

---

## 9.7 `src/controllers/codec.controller.ts` (full file)

```ts
import { Request, Response } from 'express';
import { decodeReport, frameReport, torture, type FragmentMode } from '../services/codec.service.js';

/**
 * Chapter 04 — the codec endpoints.
 *
 * There is no model call here. This is the CLIENT half of the pipeline, exposed
 * over HTTP so the experiments in the notes are runnable: split a real multi-byte
 * payload at byte level and watch one decoder survive it and the other not.
 */

/** Chapter 04 §04.4 — naive vs streaming decode, over the same bytes. */
export const postDecode = (req: Request, res: Response): void => {
  const { text, chunkSize } = req.body as { text: string; chunkSize: FragmentMode };

  res.status(200).json({
    success: true,
    data: {
      ...decodeReport(text, chunkSize),
      note: 'Chapter 04 §04.4 — a per-chunk TextDecoder cannot hold an incomplete multi-byte sequence.',
    },
  });
};

/** Chapter 04 §04.3/§04.5 — frame reassembly with and without a leftover buffer. */
export const postFrames = (req: Request, res: Response): void => {
  const { text, chunkSize } = req.body as { text: string; chunkSize: FragmentMode };

  res.status(200).json({
    success: true,
    data: {
      ...frameReport(text, chunkSize),
      note: 'Chapter 04 §04.3 — accumulate before splitting, and retain the tail; the naive parser drops it.',
    },
  });
};

/** Chapter 04 §04.6 / chapter 09 §09.10 — the fragmentation torture test. */
export const postTorture = (req: Request, res: Response): void => {
  const { text, seed } = req.body as { text: string; seed: number };
  const report = torture(text, seed);

  res.status(report.ok ? 200 : 500).json({
    success: report.ok,
    data: {
      ...report,
      note: 'Chapter 04 §04.6 — if the accumulated text changes with the fragment size, the client has a bug.',
    },
  });
};
```

### Block by block

**All three handlers are three lines of work and one line of explanation.** They parse nothing (the middleware
already did), open no stream, and touch no provider. The `note` field is not decoration: it is the sentence from
the notes that the caller should read next to the data.

**`res.status(report.ok ? 200 : 500)` is the difference between a report and a test.** `postDecode` and
`postFrames` always return `200` because they are *demonstrations* — a failing decoder is the expected outcome.
`postTorture` is different: it asserts that the client is correct, so a failure is an error. That single ternary
is what lets the endpoint sit in a CI pipeline.

**Why the codec endpoints are not part of the chat flow.** They share no state, take no `conversationId`, and
never call a model. Keeping them separate makes the boundary obvious: chapters 01–03 and 05–09 are about
*delivery*, and chapter 04's codec is about *transport correctness*. Mixing them into `/api/chat` would hide
that this half of the pipeline can be tested with zero dependencies.

---

## 9.8 Verifying this chapter

```bash
curl -s -X POST http://localhost:8097/api/codec/torture -H 'Content-Type: application/json' \
  -d '{"text":"Spring ₹500 café naïve 日本語 😀","seed":42}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("success:", d["success"]); [print(f"  {c[\"strategy\"]:18} {c[\"mode\"]:4} chunks={c[\"chunks\"]:3} ok={c[\"ok\"]}") for c in d["data"]["cases"]]'
```

Expected: **ten rows, all `ok=True`**, including `per-byte` at 41 (raw) and 79 (sse) chunks.

> **The bug this test found.** The first run failed 5 of 10 cases with `actual` one character short:
> `日本語😀` instead of `日本語 😀`. The cause was `trimStart()` in the frame parser stripping a payload's own
> leading space (chapter 08 §8.6). No other test in this lab would have caught it — which is exactly the
> argument for the torture test being part of the build rather than a manual experiment.

---

**Previous:** [Chapter 08 — Granularity: Codec & Frame Reassembly](./08_Granularity_Codec_and_Frame_Reassembly.md) ·
**Next:** [Chapter 10 — Metrics & the TTFT Gap](./10_Metrics_and_the_TTFT_Gap.md)