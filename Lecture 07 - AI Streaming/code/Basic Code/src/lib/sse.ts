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
