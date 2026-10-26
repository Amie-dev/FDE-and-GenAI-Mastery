# Chapter 12: App, Server & Graceful Shutdown

> **Chapter goal:** assemble the Express app, serve the one browser client, and make shutdown a streaming-aware
> operation. A deploy must not truncate a live conversation — that is the 21st item on chapter 09 §09.7's
> hardening checklist, and this chapter implements it.
> **Notes chapters covered:** 02 §02.8 (fail before the first byte), 05 §05.6 (infrastructure that breaks
> streaming), 06 §06.2 (owners per hop), 08 §08.1 (the client is part of the pipeline), 09 §09.7 item 21
> (graceful shutdown).

---

## 12.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/app.ts` | the Express app: json · static · request log · 404 · error mapping |
| `src/server.ts` | `listen` · the startup banner · SIGTERM/SIGINT graceful shutdown |

---

## 12.2 Commands

```bash
npm run typecheck
npm run dev            # or: npm run build && npm start

# then, in another shell, watch the drain
kill -TERM <pid>
```

---

## 12.3 `src/app.ts` (full file)

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { NextFunction, Request, Response } from 'express';
import { router } from './routes/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use(express.json({ limit: '1mb' }));

/**
 * Chapter 08 — the one browser client.
 * Served so the lecture's completion gate ("render a stream and cancel it
 * mid-flight") is testable without writing any client code yourself.
 * `../public` resolves from both `src/` (tsx) and `dist/` (compiled).
 */
app.use(express.static(path.join(here, '..', 'public')));

/** One log line per request; the timestamp is what you grep for later. */
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api', router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource does not exist.' });
});

/**
 * Chapter 02 §02.8 — map an error to the status the client can act on.
 * Everything that can be a 400 is a 400 here, BEFORE any stream has started:
 * after the first byte the status is frozen and errors must travel in-band
 * (chapter 07 §07.7).
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = Number((error as { status?: number }).status) || 500;
  const titles: Record<number, string> = {
    400: 'Bad Request',
    404: 'Not Found',
    502: 'Provider returned an unusable response',
    503: 'Model credentials are not configured',
  };

  console.error(`❌ ${status} ${error.message}`);
  res.status(status).json({ error: titles[status] ?? 'Internal Server Error', message: error.message });
});
```

### Block by block

**`here` is computed from `import.meta.url`, not from `process.cwd()`.**

```ts
const here = path.dirname(fileURLToPath(import.meta.url));
```

This matters for the static path. `import.meta.url` is the *file's* location, so `../public` resolves correctly
whether the app runs from `src/` (via `tsx`) or from `dist/` (via `npm start`) — and regardless of which
directory you launched it from. Using `process.cwd()` would break the moment someone ran `npm start` from the
repository root.

**`express.json({ limit: '1mb' })` comes first, and the limit is a streaming-relevant choice.** It bounds the
request body. Note what it does *not* do: it does not touch the response. A middleware that buffered the response
would break invariant 2 (chapter 06 §06.3), and there is none here — the response is written by hand in the
controller, which is the only way to guarantee a flush per frame.

**`express.static` is mounted *before* the request logger, so a page load is not logged as an API call.** It is
also mounted before `/api`, which means a static file named `api` could shadow the router — acceptable in a lab,
and worth knowing about in production (mount the API first if that matters).

**The request logger is one line per request, and it is the first diagnostic tool.** Chapter 05 §05.6's
`curl -N` heuristic depends on being able to see whether the *server* received the request at all. A timestamped
`METHOD /path` line is enough to answer "did it get here?" without a tracing stack.

**The 404 handler is registered after the router and before the error handler.** Express matches middleware in
order, so this placement means: if no route matched, answer 404; if a route threw, fall through to the error
handler. Reversing them would swallow errors as 404s.

**The error handler is the "before the first byte" boundary of chapter 02 §02.8.**

| Status | Meaning in this lab |
| :--- | :--- |
| `400` | validation failed (from the middleware) |
| `404` | unknown conversation, or unknown route |
| `502` | the provider returned something unusable |
| `503` | credentials are missing |
| `500` | anything else — a bug |

The `titles` map gives each status a human-readable title, and `Number(error.status) || 500` means a handler can
signal a status by attaching `.status` to an `Error` — the Express convention, without a dependency.

**The comment is the important part: everything that *can* be a 400 must be one here.** Once the controller has
called `openSseStream`, this handler can never be reached for that request — the response is already committed
and the error has to travel in-band (chapter 07 §07.7). This file is where the *last* chance for a real status
code lives.

---

## 12.4 `src/server.ts` (full file)

```ts
import { app } from './app.js';
import { config, PUMP_POLICY } from './config/config.js';
import { isOffline } from './lib/llm.js';
import { activeStreams } from './services/metrics.service.js';

const server = app.listen(config.PORT, () => {
  console.log('=======================================================');
  console.log('🚀 Lecture 07 — Basic AI Streaming Lab');
  console.log(`📡 Server           : http://localhost:${config.PORT}`);
  console.log(`🌐 Browser client   : http://localhost:${config.PORT}/  (chapter 08)`);
  console.log(`🤖 Provider         : ${config.AI_PROVIDER} · ${config.AI_MODEL} (temperature ${config.AI_TEMPERATURE})`);
  console.log(`🔑 Mode             : ${isOffline() ? 'OFFLINE stub — every endpoint still works' : 'LIVE provider'}`);
  console.log(`⚙️  Cadence (offline): prefill ${config.OFFLINE_TTFT_MS} ms (TTFT) · decode ${config.OFFLINE_ITL_MS} ms (ITL)`);
  console.log(`🚚 Stream pump      : coalesce on ${PUMP_POLICY.flushIntervalMs} ms OR ${PUMP_POLICY.flushBytes} bytes · first piece always immediate`);
  console.log(`💓 Heartbeat        : SSE comment every ${config.HEARTBEAT_MS} ms`);
  console.log('-------------------------------------------------------');
  console.log('🔍 GET    /api/health                       (wiring + the 7 invariants)');
  console.log('📦 POST   /api/chat                         (buffered — ch 02 §02.2)');
  console.log('📄 POST   /api/chat/stream                  (raw text/plain — ch 05 §05.5)');
  console.log('⚡ POST   /api/chat/events                   (SSE text/event-stream — ch 05 §05.3)');
  console.log('🗂️  GET    /api/conversation/:conversationId  (dual-write proof — ch 09 §09.2)');
  console.log('📈 GET    /api/metrics                      (TTFT · ITL · TPS · frames — ch 03 §03.5)');
  console.log('🧬 POST   /api/codec/decode                 (naive vs streaming decode — ch 04 §04.4)');
  console.log('🧩 POST   /api/codec/frames                 (leftover buffer — ch 04 §04.3)');
  console.log('🔥 POST   /api/codec/torture                (fragmentation test — ch 04 §04.6)');
  console.log('=======================================================');
});

/**
 * Chapter 09 §09.7 item 21 — graceful shutdown.
 *
 * A deploy must not truncate a live conversation. Stop accepting new streams,
 * let the in-flight ones drain for a bounded grace period, then close.
 */
let shuttingDown = false;

const shutdown = (signal: string): void => {
  if (shuttingDown) return;
  shuttingDown = true;

  const inFlight = activeStreams();
  console.log(`\n${signal} received — draining ${inFlight} in-flight stream(s) (grace ${config.SHUTDOWN_GRACE_MS} ms)`);

  // Stop accepting new connections; existing responses keep writing.
  server.close(() => {
    console.log('✅ HTTP server closed cleanly.');
    process.exit(0);
  });

  const deadline = Date.now() + config.SHUTDOWN_GRACE_MS;
  const drain = setInterval(() => {
    if (activeStreams() > 0 && Date.now() < deadline) return;

    clearInterval(drain);
    if (activeStreams() > 0) console.warn(`⚠️  Grace period expired with ${activeStreams()} stream(s) still open.`);
    // Keep-alive sockets would otherwise hold `close()` open forever.
    server.closeAllConnections?.();
  }, 100);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

### Block by block

**The banner is the first thing a reader sees, and it is a summary of the whole lecture.** Every line maps to a
decision made in an earlier chapter:

| Line | Chapter |
| :--- | :--- |
| `Mode` (OFFLINE / LIVE) | 01 §01.5 — the same loop, two delivery shapes |
| `Cadence (offline)` | 01 §01.3 — prefill sets TTFT, decode sets ITL |
| `Stream pump` | 07 §07.6 — the coalescing policy, *and* that the first piece is immediate |
| `Heartbeat` | 05 §05.3.3 — a no-op every 15 s |
| the endpoint list | 06 §06.2 — the wiring, with the chapter that owns each route |

It is deliberately verbose. A learner starting the process should be able to see the lecture's shape before
sending a single request.

**`activeStreams()` is imported from the metrics service, and that import is the point.** The counter was
incremented in the controller and decremented in its `finally`; `server.ts` is the third party that reads it. One
counter, three readers, no duplication — and `server.ts` never touches the conversation store or the pump.

**`shuttingDown` guards against a double signal.** A container runtime often sends `SIGTERM` and then `SIGKILL`,
and a developer pressing Ctrl-C twice sends two `SIGINT`s. Without the flag, the second signal would run the
drain logic again, create a second interval, and register a second `server.close()` callback.

**`server.close(cb)` stops accepting new connections but lets existing responses finish — which is exactly what a
streaming service needs.** The callback fires once all connections are closed, and that is where the process exits
with code 0. Note that `close()` alone is *not* sufficient in practice: keep-alive connections are idle but still
open, so `close()` would never call back. Hence the drain loop.

**The drain loop is a bounded poll, and the bound is `SHUTDOWN_GRACE_MS`.**

```ts
const drain = setInterval(() => {
  if (activeStreams() > 0 && Date.now() < deadline) return;
  clearInterval(drain);
  …
  server.closeAllConnections?.();
}, 100);
```

| Element | Why |
| :--- | :--- |
| `activeStreams() > 0 && Date.now() < deadline` | keep waiting only while there is work **and** time |
| `clearInterval(drain)` | the poll must stop, or the process would never exit |
| the warning | an expired grace period is a *visible* fact, not a silent truncation |
| `server.closeAllConnections?.()` | force-close the idle keep-alive sockets so `close()` can complete |
| `?.` | the method is newer than the minimum Node version; the drain must not crash without it |

100 ms is a deliberate compromise: fast enough that a normal shutdown finishes in well under a second, slow
enough that it costs nothing while waiting.

**The two signals are both handled, and the difference matters.** `SIGTERM` is what orchestrators send
(Kubernetes, ECS, systemd) — it is the *request* to stop. `SIGINT` is what a terminal sends on Ctrl-C. Handling
both with the same function means local development exercises the same code path as production, which is the only
way the drain logic ever gets tested.


---

## 12.5 Why graceful shutdown belongs in a streaming lecture

Chapter 09 §09.7's checklist has 20 items; this lab adds the 21st because streaming makes shutdown *asymmetric*
in a way buffered services are not:

| | Buffered service | Streaming service |
| :--- | :--- | :--- |
| In-flight request | a few milliseconds of CPU | seconds of *provider* work you are paying for |
| On shutdown | killing it loses one response | killing it loses **text the user has already read** |
| Recovery | the client retries | the client has a half-answer on screen and no way to know it was truncated |

That second row is the argument. A buffered response that dies at 90% produces nothing; a streamed response that
dies at 90% produces a *plausible-looking answer that is wrong*, because the user has no way to tell a truncated
stream from a complete one — unless `finishReason` reached them (chapter 01 §01.2.4). Draining for a bounded grace
period is how you avoid manufacturing that failure on every deploy.

---

## 12.6 Verifying this chapter

```bash
# start it, then send a long stream and SIGTERM 0.4 s in
npm run dev & sleep 3
curl -sN -X POST http://localhost:8097/api/chat/events -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch12","message":"long answer"}' > /tmp/partial.txt &
sleep 0.4
pkill -TERM -f 'tsx src/server.ts'
wait
echo "--- what the client received ---"; wc -c /tmp/partial.txt; grep -c '^event: token' /tmp/partial.txt
```

Expected, in the server log:

```text
SIGTERM received — draining 1 in-flight stream(s) (grace 10000 ms)
✅ HTTP server closed cleanly.
```

and in `/tmp/partial.txt`: the **complete** answer (~1009 bytes, 17 token frames) plus the `done` event — because
the drain let the stream finish instead of truncating it. The port then stops accepting connections.

---

**Previous:** [Chapter 11 — Validation, Controllers & Routes](./11_Validation_Controllers_and_Routes.md) ·
**Next:** [Chapter 13 — The Browser Client & End-to-End Verification](./13_Browser_Client_and_End_to_End_Verification.md)