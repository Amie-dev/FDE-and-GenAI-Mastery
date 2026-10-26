# Chapter 08: Granularity — Codec & Frame Reassembly

> **Chapter goal:** make the four granularities runnable. Split a real multi-byte payload at byte level, decode
> it the wrong way and the right way, and reassemble SSE frames with a leftover buffer. Nothing in this chapter
> involves a model: this is the *client half* of the pipeline, written server-side so you can call it.
> **Notes chapters covered:** 04 §04.1 (the four layers), 04 §04.2 (tokens coalesced into deltas),
> 04 §04.3 (transport fragmentation), 04 §04.4 (the UTF-8 multi-byte split), 04 §04.5 (blind accumulation,
> accumulate-before-split, retain-the-tail), 05 §05.3.1 (the `data:` line), 08 §08.5/§08.6 (the client loop and
> one decoder).

---

## 8.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/codec.service.ts` (part 1) | `FragmentMode` · `fragment` · `decodeNaive` · `decodeStreaming` · `toSseBody` · `frameText` · `reassembleFrames` · `reassembleNaive` |
| `src/services/codec.service.ts` (part 2) | `clientConsume` · `decodeReport` · `frameReport` · `torture` — see [Chapter 09](./09_The_Fragmentation_Torture_Test.md) |

---

## 8.2 Commands

```bash
npm run typecheck

curl -s -X POST http://localhost:8097/api/codec/decode -H 'Content-Type: application/json' \
  -d '{"text":"₹500 café 😀","chunkSize":"byte"}' | python3 -m json.tool

curl -s -X POST http://localhost:8097/api/codec/frames -H 'Content-Type: application/json' \
  -d '{"text":"₹500 café 😀","chunkSize":"byte"}' | python3 -m json.tool
```

---

## 8.3 `src/services/codec.service.ts` — part 1 (full)

```ts
import type { DecodeReport, FrameReport, TortureCase, TortureReport } from '../types/streaming.types.js';

/**
 * Chapter 04 — the four granularities, made runnable.
 *
 * Nothing here is AI-specific. It is the *client half* of the pipeline, written
 * server-side so you can call it: bytes travel the wire, characters are decoded,
 * frames are reassembled, and boundaries are never guaranteed.
 *
 * The three functions that matter:
 *   decodeStreaming()   — ONE TextDecoder with { stream: true }, flushed at the end
 *   reassembleFrames()  — accumulate before splitting, and RETAIN the tail
 *   clientConsume()     — the whole client algorithm from chapter 08 §08.5
 */

export type FragmentMode = 'whole' | 'char' | 'byte' | 'random' | 'newline' | number;

/** Deterministic PRNG, so a "random" fragmentation is reproducible. */
const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/**
 * Chapter 04 §04.6 — the fragmentation strategies of the torture test.
 * `byte` is the important one: it GUARANTEES that multi-byte characters are split.
 */
export const fragment = (bytes: Uint8Array, mode: FragmentMode, seed = 1): Uint8Array[] => {
  if (mode === 'whole') return [bytes];

  if (mode === 'byte') {
    return Array.from({ length: bytes.length }, (_, index) => bytes.slice(index, index + 1));
  }

  if (mode === 'char') {
    // Split on CHARACTER boundaries: safe, and proof that the bug is about bytes.
    return [...new TextDecoder().decode(bytes)].map((char) => new TextEncoder().encode(char));
  }

  if (mode === 'newline') {
    const text = new TextDecoder().decode(bytes);
    return text
      .split(/(?<=\n)/)
      .filter((part) => part.length > 0)
      .map((part) => new TextEncoder().encode(part));
  }

  const random = mulberry32(seed);
  const chunks: Uint8Array[] = [];
  let index = 0;
  while (index < bytes.length) {
    const size = typeof mode === 'number' ? mode : 1 + Math.floor(random() * 64);
    chunks.push(bytes.slice(index, index + size));
    index += size;
  }
  return chunks;
};

/**
 * Chapter 04 §04.4 — the WRONG way: a fresh decoder per chunk.
 * It is stateless between calls, so an incomplete multi-byte sequence is
 * unrecoverable and shows up as a replacement character.
 */
export const decodeNaive = (chunks: Uint8Array[]): string =>
  chunks.map((chunk) => new TextDecoder('utf-8').decode(chunk)).join('');

/**
 * Chapter 04 §04.4 — the ONLY correct contract:
 * one decoder per response, `{ stream: true }`, and a final flush.
 */
export const decodeStreaming = (chunks: Uint8Array[]): string => {
  const decoder = new TextDecoder('utf-8'); // ⬅ created ONCE, outside the loop
  let text = '';
  for (const chunk of chunks) {
    text += decoder.decode(chunk, { stream: true });
  }
  return text + decoder.decode(); // ⬅ flush whatever the decoder still holds
};
```

---

## 8.5 `src/services/codec.service.ts` — part 1, continued (full)

```ts
/**
 * Chapter 05 §05.3.1 — a real SSE body: `data:` lines, frames terminated by a blank line.
 *
 * Deltas are cut on CHARACTER boundaries, because the server always writes whole
 * characters. The byte-level damage happens later, in the network — which is what
 * `fragment()` simulates.
 */
export const toSseBody = (payload: string, deltaSize = 12): string => {
  const chars = [...payload];
  const deltas: string[] = [];
  for (let index = 0; index < chars.length; index += deltaSize) {
    deltas.push(chars.slice(index, index + deltaSize).join(''));
  }
  return `${deltas.map((text) => `data: ${text}\n\n`).join('')}data: [DONE]\n\n`;
};

/**
 * Chapter 05 §05.3.1 — what a `data:` frame carries, or null if it is not text.
 *
 * The one subtlety worth memorising: SSE removes **exactly one** space after the
 * colon. Using `trimStart()` here would silently delete a payload that *starts*
 * with a space — a bug this lab's own torture test caught (see the guide).
 */
const frameText = (frame: string): string | null => {
  const lines = frame.split('\n').filter((line) => line.startsWith('data:'));
  if (lines.length === 0) return null; // a comment frame (`: keep-alive`) — ignore it

  const payload = lines
    .map((line) => {
      const value = line.slice(5);
      return value.startsWith(' ') ? value.slice(1) : value;
    })
    .join('\n');

  return payload === '[DONE]' ? null : payload; // the sentinel is NOT text
};

/**
 * Chapter 04 §04.3 / §04.5 — frame reassembly with a leftover buffer.
 * The two invariants: ACCUMULATE before splitting, and RETAIN the tail.
 */
export const reassembleFrames = (
  text: string,
  previousLeftover = '',
): { frames: string[]; leftover: string; texts: string[] } => {
  const buffer = previousLeftover + text;
  const parts = buffer.split('\n\n');
  const leftover = parts.pop() ?? ''; // ⬅ the trailing incomplete frame
  const frames = parts.filter((frame) => frame.trim().length > 0);

  return {
    frames,
    leftover,
    texts: frames.map(frameText).filter((value): value is string => value !== null),
  };
};

/**
 * Chapter 04 §04.3 — the naive parser: split each read and DISCARD the tail.
 * This is the classic frontend bug, and the endpoint shows exactly how much text
 * it loses.
 */
export const reassembleNaive = (chunk: string): { frames: number; text: string } => {
  const parts = chunk.split('\n\n');
  parts.pop(); // ⬅ the bug
  const frames = parts.filter((frame) => frame.trim().length > 0);
  return {
    frames: frames.length,
    text: frames.map(frameText).filter((value): value is string => value !== null).join(''),
  };
};
```

---

## 8.6 Block by block — the frame parser

**`toSseBody` cuts on character boundaries, and that is a deliberate correction.** The first version of this
function reused the byte fragmenter:

```ts
fragment(new TextEncoder().encode(payload), deltaSize).map((b) => new TextDecoder().decode(b))
```

It worked for one payload and produced mojibake for another, because a fixed *byte* cut can land inside a
character and the decode is stateless. The fix is a reminder that the notes apply to your own tooling too: **the
server writes whole characters; only the network fragments bytes.** `fragment()` exists to simulate the network,
so it must not be used to build the body.

**`frameText` — the one-space rule, and the bug the torture test caught.**

SSE's specification is precise: after `data:`, **exactly one** leading space is removed if present. The obvious
implementation is `line.slice(5).trimStart()`, and it is wrong: `trimStart()` removes *all* leading whitespace,
so a payload that legitimately begins with a space loses it.

This lab hit that exact bug. With a payload containing `日本語 😀`, the SSE body is
`data: 本語 😀`-shaped, the delta beginning with a space was parsed as `😀`, and the accumulated text came out as
`日本語😀` — one character short, with no error anywhere. The torture test failed on 5 of 10 cases and pointed
straight at it.

```ts
const value = line.slice(5);
return value.startsWith(' ') ? value.slice(1) : value;
```

| Element | Why |
| :--- | :--- |
| `line.slice(5)` | drop `data:` exactly (five characters) |
| `value.startsWith(' ') ? value.slice(1) : value` | remove **one** space, only if present |
| `.join('\n')` | SSE joins multiple `data:` lines with a newline — the spec, not a convenience |

The `return null` for `[DONE]` is the other half of chapter 02 §02.4: the sentinel travels on a `data:` line, so
a parser that treats every `data:` line as text appends the literal string `[DONE]` to the answer.

**`reassembleFrames` is the correct parser, in four lines.**

```ts
const buffer = previousLeftover + text;   // ⬅ ACCUMULATE before splitting
const parts = buffer.split('\n\n');
const leftover = parts.pop() ?? '';       // ⬅ RETAIN the tail
const frames = parts.filter((frame) => frame.trim().length > 0);
```

Those are the two invariants of chapter 04 §04.5, and the order matters. Splitting *before* prepending the
leftover would cut a frame in half; forgetting `pop()` would either drop the tail (if you discard it) or
reprocess it forever (if you keep it in the buffer).

Two details worth noting:

- `parts.pop()` returns `string | undefined`, hence `?? ''`. That is the empty-string case, not an error case.
- Frames are filtered on `frame.trim().length > 0` **before** `frameText`, so a bare heartbeat (`: keep-alive`)
  is passed to `frameText`, which returns `null` for it because it has no `data:` line. Two layers, each with
  one job.

**`reassembleNaive` is the bug, isolated to one line.**

```ts
parts.pop(); // ⬅ the bug
```

Everything else is identical. The tail is thrown away on every read, so any frame that straddles a chunk
boundary is lost. Chapter 04 §04.3 calls this "the classic frontend bug"; at byte-level fragmentation it loses
*everything*, and the endpoint shows exactly that: `"naive": { "frames": 0, "text": "" }` next to a correct
result that matches the payload.

> **Why both parsers are in the same file.** A bug you cannot reproduce is a bug you cannot fix. Keeping the
> broken version callable — and printing its output beside the correct output — turns "don't do this" into an
> observable fact.

---

## 8.7 Verifying this chapter

```bash
# The ₹ example, split at every byte: one decoder survives, the other does not
curl -s -X POST http://localhost:8097/api/codec/decode -H 'Content-Type: application/json' \
  -d '{"text":"₹500 café 😀","chunkSize":"byte"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]; print("naive    :", repr(d["naive"])); print("streaming:", repr(d["streaming"])); print("naive ok :", d["naiveIsCorrect"], "| streaming ok:", d["streamingIsCorrect"])'

# The same payload split on CHARACTER boundaries: both survive
curl -s -X POST http://localhost:8097/api/codec/decode -H 'Content-Type: application/json' \
  -d '{"text":"₹500 café 😀","chunkSize":"char"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]; print("naive ok :", d["naiveIsCorrect"], "| streaming ok:", d["streamingIsCorrect"])'

# Frames: the leftover buffer wins, the naive parser loses everything
curl -s -X POST http://localhost:8097/api/codec/frames -H 'Content-Type: application/json' \
  -d '{"text":"₹500 café 😀","chunkSize":"byte"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]; print("correct:", repr(d["correct"]["text"]), "| naive:", repr(d["naive"]["text"]), "| equal:", d["equal"])'
```

Expected: `naive : '500 caf'` versus `streaming: '₹500 café 😀'`; then **both true** for the character
split; then `correct: '₹500 café 😀' | naive: '' | equal: True`.

---

**Previous:** [Chapter 07 — Buffered vs Streamed Orchestration](./07_Buffered_vs_Streamed_Orchestration.md) ·
**Next:** [Chapter 09 — The Fragmentation Torture Test](./09_The_Fragmentation_Torture_Test.md)