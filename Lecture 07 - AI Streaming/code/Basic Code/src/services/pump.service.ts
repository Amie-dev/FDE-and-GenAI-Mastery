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
