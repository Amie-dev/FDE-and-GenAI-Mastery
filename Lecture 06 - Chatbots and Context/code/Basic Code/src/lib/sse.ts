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
