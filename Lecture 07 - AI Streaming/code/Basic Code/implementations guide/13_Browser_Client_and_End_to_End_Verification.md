# Chapter 13: The Browser Client & End-to-End Verification

> **Chapter goal:** finish the pipeline in the browser — one bubble, one decoder, a leftover frame buffer,
> cancellation that preserves partial text, and the TTFT gap on screen. Then verify the whole lab end to end.
> **Notes chapters covered:** 08 §08.1 (backend streaming is half the work), 08 §08.2 (the one-line collapse),
> 08 §08.3 (`fetch` resolves on headers), 08 §08.5/§08.6 (the read loop and the decoder), 08 §08.7 (one bubble),
> 08 §08.9 (auto-scroll), 08 §08.11 (cancellation), 08 §08.12 (performance, framework, accessibility),
> 04 §04.5 (frame reassembly in the client), 03 §03.5 (the TTFT gap), 09 §09.10 (the CI assertions).

---

## 13.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `public/index.html` | the one browser client: `getReader()` loop · one `TextDecoder` · `absorb()` frame parser · one growing bubble · `AbortController` · the TTFT gap HUD |

> This is the **only non-TypeScript file** in the lab, and it exists because chapter 08 is a whole chapter of the
> notes. Without it, "the frontend can undo the entire backend" would be a claim you could not reproduce.

---

## 13.2 Commands

```bash
npm run dev
# then open http://localhost:8097/  and click Send
```

---

## 13.3 `public/index.html` — markup and styles (full)

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Lecture 07 — AI Streaming</title>
<style>
  :root { color-scheme: dark; }
  body { font: 15px/1.5 system-ui, sans-serif; margin: 0; padding: 16px; background: #0f1115; color: #e6e6e6; }
  h1 { font-size: 16px; margin: 0 0 12px; font-weight: 600; }
  #log { border: 1px solid #262b36; border-radius: 8px; padding: 12px; height: 60vh; overflow-y: auto; }
  .row { margin: 0 0 10px; display: flex; }
  .row.user { justify-content: flex-end; }
  .row span { padding: 8px 10px; border-radius: 8px; max-width: 80%; white-space: pre-wrap; }
  .user span { background: #1d4ed8; }
  .assistant span { background: #1c2129; border: 1px solid #2b323d; }
  .row[data-status="stopped"] span { border-color: #b45309; }
  form { display: flex; gap: 8px; margin: 12px 0 6px; }
  input { flex: 1; padding: 9px 10px; border-radius: 6px; border: 1px solid #2b323d; background: #141821; color: inherit; }
  button { padding: 9px 14px; border-radius: 6px; border: 1px solid #2b323d; background: #1c2129; color: inherit; cursor: pointer; }
  button:disabled { opacity: .45; cursor: not-allowed; }
  #hud { font-family: ui-monospace, monospace; font-size: 12px; color: #93a1b1; margin: 0; }
</style>
</head>
<body>
  <h1>Lecture 07 — AI Streaming · one bubble, one decoder, cancellable</h1>
  <div id="log" aria-live="polite" aria-busy="false"></div>

  <form id="form">
    <input id="input" value="Explain streaming in one short paragraph." />
    <button id="send" type="submit">Send</button>
    <button id="stop" type="button" disabled>Stop</button>
  </form>
  <p id="hud">idle</p>
</body>
</html>
```

### Block by block

**`<div id="log" aria-live="polite" aria-busy="false">` is the accessibility contract of chapter 08 §08.12.**

| Attribute | Why |
| :--- | :--- |
| `aria-live="polite"` | a screen reader announces new content **without interrupting** — `assertive` would interrupt on every token |
| `aria-busy="false"` | toggled to `true` while streaming, so assistive tech knows the region is mid-update |

The note in chapter 08 §08.12 is worth repeating: an `aria-live` region updated per token makes a screen reader
unusable. This lab updates the DOM on every token but only changes `aria-busy` twice per turn, which is the
cheapest correct compromise for a lab — a production client would also rate-limit announcements to sentence
granularity.

**`white-space: pre-wrap` on the bubble is not cosmetic.** The answer contains real newlines and runs of spaces;
without it the browser collapses them and the reassembled text *looks* wrong even when it is byte-perfect — which
would make debugging the UTF-8 work much harder than it needs to be.

**`.row[data-status="stopped"] span { border-color: #b45309; }` is the visual half of chapter 08 §08.11.** When a
user presses Stop, the bubble is not deleted and no error is shown — it is *marked*. That single CSS rule is what
"an abort is not an error" looks like on screen.

**The `input` keeps a usable default prompt.** A learner should be able to open the page, click Send, and watch a
stream — no typing required, and no LLM key required (OFFLINE mode).

**Two buttons, and Stop starts disabled.** The state machine is: idle (Send enabled, Stop disabled) → streaming
(Send disabled, Stop enabled) → idle. That is the same state machine the React pseudocode in chapter 08 §08.12
describes, written imperatively.

---

**Previous:** [Chapter 12 — App, Server & Graceful Shutdown](./12_App_Server_and_Graceful_Shutdown.md) ·
**Next:** [Chapter 13 — the script, and end-to-end verification](#134-the-clients-script-full)

---

## 13.4 The client's script (full)

```html
<script>
  // Chapter 08 §08.1 — everything the server built can be undone right here.
  const API = '/api/chat/events';
  const conversationId = 'demo-' + Math.random().toString(36).slice(2, 8);

  const log = document.getElementById('log');
  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('send');
  const stopBtn = document.getElementById('stop');
  const hud = document.getElementById('hud');

  let controller = null;   // one per request, never reused (§08.11)
  let decoder = null;      // ONE per response, created outside the loop (§08.6)
  let leftover = '';       // the frame-reassembly buffer (§04.5)
  let bubble = null;       // ONE assistant bubble, created lazily (§08.7)
  let text = '';           // ONE accumulator — chunks are not messages (§08.7)
  let startedAt = 0;
  let firstCharAt = 0;
  let serverTtftMs = null;

  function scrollToBottom() {
    // Sticky scroll: pin to the bottom unless the reader has scrolled up (§08.9).
    const distance = log.scrollHeight - log.scrollTop - log.clientHeight;
    if (distance < 40) log.scrollTop = log.scrollHeight;
  }

  function addBubble(role, content) {
    const row = document.createElement('div');
    row.className = 'row ' + role;
    const span = document.createElement('span');
    span.textContent = content;   // ⬅ textContent, never innerHTML: no XSS surface (§08.10)
    row.appendChild(span);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return span;
  }

  // Chapter 04 §04.5 — accumulate BEFORE splitting, and RETAIN the tail.
  function absorb(piece) {
    leftover += piece;
    const frames = leftover.split('\n\n');
    leftover = frames.pop() || '';

    for (const frame of frames) {
      if (!frame.trim()) continue;                 // empty frame
      if (frame.trim().startsWith(':')) continue;  // heartbeat comment — not text (§05.3.3)
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;          // the sentinel is not text (§02.4)
      handleFrame(frame, payload);
    }
  }

  function handleFrame(frame, payload) {
    const type = (frame.match(/^event:\s*(.+)$/m) || [])[1] || 'message';
    const data = JSON.parse(payload);

    if (type === 'token') {
      if (!bubble) bubble = addBubble('assistant', '');  // create ONCE, on first text (§08.7)
      text += data.text;                                 // append, never replace (§08.7)
      bubble.textContent = text;
      if (!firstCharAt) firstCharAt = performance.now();
      scrollToBottom();
    } else if (type === 'done') {
      serverTtftMs = data.ttftMs;
      hud.textContent = report(data);
    } else if (type === 'error') {
      addBubble('assistant', 'Stream error (' + data.code + '): ' + data.message);
    }
  }

  // Chapter 03 §03.5 — the client TTFT is the number the user feels,
  // and the GAP is the one alert worth having (§09.8).
  function report(done) {
    const clientTtft = firstCharAt ? Math.round(firstCharAt - startedAt) : null;
    const gap = clientTtft !== null && serverTtftMs !== null ? clientTtft - serverTtftMs : null;
    return 'server TTFT ' + serverTtftMs + ' ms · client TTFT ' + clientTtft +
           ' ms · gap ' + gap + ' ms · ITL ' + done.itlMs + ' ms · ' + done.finishReason;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    addBubble('user', message);
    input.value = '';
    sendBtn.disabled = true;
    stopBtn.disabled = false;
    log.setAttribute('aria-busy', 'true');   // §08.12 — announce the generating state
    hud.textContent = 'streaming…';

    controller = new AbortController();
    decoder = new TextDecoder('utf-8');       // ⬅ ONE, outside the loop (§04.4)
    leftover = '';
    bubble = null;
    text = '';
    firstCharAt = 0;
    serverTtftMs = null;
    startedAt = performance.now();

    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('HTTP ' + response.status);
      // fetch() resolved on HEADERS — the body is still arriving (§08.3).
      const reader = response.body.getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;                                    // `done` is not text (§08.5)
        absorb(decoder.decode(value, { stream: true }));    // ⬅ stream: true (§04.4)
      }
      absorb(decoder.decode());                             // ⬅ the flush, or the tail is lost

      if (!bubble) hud.textContent = 'stream produced no text';
    } catch (error) {
      if (error.name === 'AbortError') {
        // Chapter 08 §08.11 — an abort is NOT an error: keep the partial text.
        if (bubble) bubble.parentElement.dataset.status = 'stopped';
        hud.textContent = 'stopped by user — partial text kept';
      } else {
        addBubble('assistant', 'Request failed: ' + error.message);
        hud.textContent = 'error';
      }
    } finally {
      sendBtn.disabled = false;
      stopBtn.disabled = true;
      controller = null;
      log.setAttribute('aria-busy', 'false');
    }
  });

  // Chapter 06 §06.6 — cancellation must propagate upstream: abort() closes the
  // connection, the server sees `close`, and generation (and cost) stops.
  stopBtn.addEventListener('click', () => controller?.abort());
</script>
```

---

## 13.5 Block by block

**The seven `let` declarations are the entire client state, and each one maps to a notes rule.**

| Variable | Rule | Chapter |
| :--- | :--- | :--- |
| `controller` | one `AbortController` per request, never reused | 08 §08.11 |
| `decoder` | **one** `TextDecoder` per response, created outside the loop | 04 §04.4, 08 §08.6 |
| `leftover` | the trailing incomplete frame is retained, not discarded | 04 §04.5 |
| `bubble` | **one** assistant bubble, created lazily on the first text | 08 §08.7 |
| `text` | one accumulator — chunks are not messages | 08 §08.7 |
| `startedAt`, `firstCharAt` | the two timestamps that produce client TTFT | 03 §03.5 |

There is no array of messages and no per-chunk object. That absence is the design: if you ever find yourself
adding `messages.push(chunk)`, you have reintroduced the "fragment flood" anti-pattern (chapter 09 §09.11).

**`absorb()` is the client-side twin of `reassembleFrames`, and it has the same two invariants.**

```js
leftover += piece;                 // ⬅ accumulate BEFORE splitting
const frames = leftover.split('\n\n');
leftover = frames.pop() || '';     // ⬅ RETAIN the tail
```

Two extra guards, each removing one class of bug:

| Guard | Bug it prevents |
| :--- | :--- |
| `if (frame.trim().startsWith(':')) continue;` | the `: keep-alive` heartbeat would be appended to the answer (chapter 05 §05.3.3) |
| `if (payload === '[DONE]') continue;` | the sentinel would appear as literal text (chapter 02 §02.4) |

> **One deliberate simplification.** The browser uses `line.slice(5).trim()` where the server-side parser removes
> exactly one space. For the *tokens* this lab streams the difference is invisible (deltas never start with a
> space), but it is the same class of bug the torture test caught on the server (chapter 08 §8.6). The
> server-side implementation is the correct one; the client here is deliberately left simple so the two can be
> compared.

**`handleFrame` is the only place that touches the DOM, and it creates the bubble lazily.**

```js
if (!bubble) bubble = addBubble('assistant', '');   // create ONCE, on first text
text += data.text;
bubble.textContent = text;
```

Chapter 08 §08.7 gives the reason for the lazy creation: a request that fails before producing any output must not
leave an empty bubble behind. It also gives the reason for accumulating into `text` and then assigning: the
accumulator is the source of truth, and the DOM is a projection of it — never the other way round.

**`firstCharAt` is set on the first *token* event, not on the first *frame*.** That distinction is the same one
chapter 02 §02.4 warns about: the first frame is often a role declaration or, in this lab, the `status` event.
Measuring TTFT on the `status` frame would report the prefill time as zero.

**`report()` computes the gap, and it is the only place the two TTFTs meet.**

```js
const gap = clientTtft !== null && serverTtftMs !== null ? clientTtft - serverTtftMs : null;
```

Chapter 03 §03.5's table calls the gap "the diagnostic", and chapter 09 §09.8 makes it the one alert worth
having. In OFFLINE mode with no proxy in front, the expected gap is small (a few milliseconds of socket and parse
time). Put a buffering proxy in front and the same code shows a gap in the hundreds — which is the experiment
this HUD exists to make possible.

**The `submit` handler resets all seven variables *before* the request, not after.** A second message sent while
the first is still streaming would otherwise append to the previous bubble's `text`. Resetting up front means each
turn starts from a clean state, and the `finally` block only restores the *buttons*.

**The read loop is chapter 08 §08.5, verbatim in structure.**

```js
const { value, done } = await reader.read();
if (done) break;
absorb(decoder.decode(value, { stream: true }));
```

with the flush immediately after:

```js
absorb(decoder.decode());
```

Note that `fetch()` resolved **before** this loop began — on headers, not on body completion (chapter 08 §08.3).
That is why the UI can switch to "streaming…" immediately even though the first token is still ~250 ms away.

**The `catch` block distinguishes `AbortError` from everything else, and that is the whole point.**

```js
if (error.name === 'AbortError') {
  if (bubble) bubble.parentElement.dataset.status = 'stopped';
  hud.textContent = 'stopped by user — partial text kept';
}
```

No error toast, no bubble removal. Chapter 08 §08.11: "treating `AbortError` as a failure produces spurious error
toasts every time a user presses Stop — and it makes the UI look broken for a feature the user deliberately
used." The `dataset.status = 'stopped'` is what the CSS rule from §13.3 paints.

**`controller?.abort()` with the optional chain is the Stop handler in one line.** The `?.` matters: the button is
disabled while idle, but a double-click could still fire the handler after `controller` was nulled in the
`finally`. Optional chaining makes the handler idempotent, which chapter 08 §08.11 lists as a requirement
("aborts are idempotent but the UI should be too").

---

## 13.6 What the browser proves that `curl` cannot

| Claim from the notes | How this page proves it |
| :--- | :--- |
| `await fetch()` resolves on headers | "streaming…" appears immediately, before the first token |
| One `TextDecoder` + `{ stream: true }` is sufficient | `₹500`, `café`, `日本語`, `😀` all render correctly |
| The leftover buffer is required | frames are parsed, not appended raw — no `data:` text in the bubble |
| One bubble, appended forever | the answer grows in a single bubble, with no fragment flood |
| `AbortError` is not an error | Stop marks the bubble amber and keeps the text |
| Cancellation propagates upstream | after Stop, `/api/conversation/<id>` shows the turn as `interrupted` |
| The TTFT gap is measurable | the HUD prints `server TTFT`, `client TTFT` and their difference |
| Accessibility is a streaming design problem | `aria-live="polite"` + `aria-busy` toggling, not per-token announcements |

The sixth and seventh rows are the lecture's completion gate — *render a streamed response with correct UTF-8
multi-byte handling and cancel it mid-flight without leaking the connection* — and this page is where you can
watch it pass.

---

## 13.7 End-to-end verification checklist

Run the server (`npm run dev`) and walk the table. Every row maps to a chapter, and every expected value was
observed while building this lab.

| # | Check | How | Expected | Chapter |
| :---: | :--- | :--- | :--- | :---: |
| 1 | It boots in OFFLINE mode | `GET /api/health` | `"mode":"OFFLINE…"`, 7 invariants listed | 01, 06 |
| 2 | The buffered path withholds delivery | `POST /api/chat` | `serverFirstDeltaMs ≈ 276`, `clientSeesTextAtMs ≈ 1100` | 02 |
| 3 | Raw text streams and reassembles exactly | `curl -N POST /api/chat/stream` | 229 bytes, `₹ café 日本語 😀` intact | 05 |
| 4 | SSE carries typed events | `curl -N POST /api/chat/events` | `status` → 18 × `token` → `usage` → `done` → `[DONE]` | 05, 07 |
| 5 | One exchange, one assistant turn | `GET /api/conversation/<id>` | `turnCount: 2`, `assistantTurns: 1` | 09 |
| 6 | Metrics are per stream | `GET /api/metrics` | TTFT p50/p95, ITL 25, TPS 40, `fasterThanReadingRate: 1` | 03 |
| 7 | The buffered endpoint shows up as a bug | `GET /api/metrics` after `POST /api/chat` | `transport: buffered`, `frames: 1`, `charsPerFrame ≈ 217` | 04 |
| 8 | A per-chunk decoder corrupts multi-byte text | `POST /api/codec/decode {"chunkSize":"byte"}` | `naive` contains ``; `streaming` is correct | 04 |
| 9 | The bug is about *bytes*, not chunking | `POST /api/codec/decode {"chunkSize":"char"}` | both decoders correct | 04 |
| 10 | The leftover buffer is required | `POST /api/codec/frames {"chunkSize":"byte"}` | `correct.text` == payload, `naive.text` == `""` | 04 |
| 11 | The client is transport-independent | `POST /api/codec/torture` | HTTP 200, 10/10 cases `ok: true` | 04, 09 |
| 12 | Cancellation propagates upstream | `timeout 0.7 curl -N POST /api/chat/stream` | partial bytes delivered, then the socket closes | 06 |
| 13 | The partial turn is persisted | `GET /api/conversation/<id>` | `status: "interrupted"`, `finishReason: "aborted"` | 09 |
| 14 | No leaked stream after an abort | `GET /api/metrics` | `activeStreams: 0`, `abortedStreams: 1` | 06 |
| 15 | Shutdown drains in-flight streams | `kill -TERM <pid>` mid-stream | "draining 1 in-flight stream(s)" then "closed cleanly" | 09 |
| 16 | Validation happens before the first byte | `POST /api/chat {"message":""}` | HTTP 400 with `details.message` | 02 |
| 17 | The compiled build behaves identically | `npm run build && npm start`, repeat 1–3 | same results | — |

### The two CI assertions from chapter 09 §09.10

```bash
# 1) the backend actually streams — more than one frame, and TTFT well under total
curl -sN -X POST http://localhost:8097/api/chat/stream -H 'Content-Type: application/json' \
  -d '{"conversationId":"ci","message":"hello"}' > /dev/null
curl -s http://localhost:8097/api/metrics | python3 -c '
import json,sys
d = json.load(sys.stdin)["data"]["lastStream"]
assert d["frames"] > 2,                  "response arrived in a single frame — buffering somewhere!"
assert d["ttftMs"] < d["totalMs"] * 0.5, "TTFT is close to total latency — the stream is buffered"
print("ok  streams:", d["frames"], "frames, TTFT", d["ttftMs"], "of", d["totalMs"], "ms")
'

# 2) the final text is fragmentation-invariant
curl -s -X POST http://localhost:8097/api/codec/torture -H 'Content-Type: application/json' \
  -d '{"text":"Spring ₹500 café naïve 日本語 😀","seed":42}' | python3 -c '
import json,sys
d = json.load(sys.stdin)
assert d["ok"], "fragmentation changed the output: " + json.dumps([c for c in d["data"]["cases"] if not c["ok"]], ensure_ascii=False)
print("ok  torture:", len(d["data"]["cases"]), "cases, all fragmentation-invariant")
'
```

Those two scripts are the whole testing strategy in miniature: the first catches every *buffering* regression, the
second catches every *decoding/framing* regression. If both pass, the pipeline is intact from the provider to the
painted character.

---

## 13.8 Where to go next

| Want to | Do this | Chapter |
| :--- | :--- | :---: |
| See the wire | `curl -N -D -` on `/api/chat/stream`; look for `Transfer-Encoding: chunked` and no `Content-Length` | 05 |
| Break streaming on purpose | put a buffering proxy in front and watch the HUD's gap jump | 05, 09 |
| Prove the frontend can undo the backend | change the read loop to `await response.text()` and reload the page | 08 |
| See the `length` finish reason | set `AI_MAX_TOKENS=10`, restart, send a long prompt | 01, 09 |
| Watch a real stream | set `OPENAI_API_KEY` in `.env`, restart, use the same page | 07 |
| Go deeper on agency | the next lecture replaces `token` events with tool-call frames | 07 §07.10 |

---

**Previous:** [Chapter 12 — App, Server & Graceful Shutdown](./12_App_Server_and_Graceful_Shutdown.md) ·
**Index:** [Chapter 00 — Overview & File Structure](./00_Overview_and_File_Structure.md)