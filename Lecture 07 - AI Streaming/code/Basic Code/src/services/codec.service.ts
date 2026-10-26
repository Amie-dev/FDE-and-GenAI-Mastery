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

