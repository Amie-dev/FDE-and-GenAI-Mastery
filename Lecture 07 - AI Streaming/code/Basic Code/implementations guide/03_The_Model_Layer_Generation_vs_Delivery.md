# Chapter 03: The Model Layer — Generation vs Delivery

> **Chapter goal:** put *all* knowledge of the model in one file, as **one generator**. Everything else in
> this lab is delivery. If the generator is the only thing that talks to a provider, then chapter 06's
> claim — streaming is an end-to-end property of the *application* — becomes visible in the file layout.
> **Notes chapters covered:** 01 §01.3 (prefill vs decode), 01 §01.5 (the same loop, two shapes),
> 01 §01.7 (where streaming comes from), 02 §02.4 (empty first frame, `[DONE]`), 07 §07.2 (the streaming
> service), 09 §09.5 (usage at the end, estimate in between).

---

## 3.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/lib/llm.ts` | `isOffline` · `providerStream` (the one generator) · `estimate` · the OFFLINE stub |

---

## 3.2 Commands

```bash
npm run typecheck
curl -s http://localhost:8097/api/health | grep -o '"mode":"[^"]*"'
```

---

## 3.3 `src/lib/llm.ts` (full file)

```ts
import OpenAI from 'openai';
import { config } from '../config/config.js';
import type { ChatTurn, Usage } from '../types/streaming.types.js';

/**
 * Chapter 01 §01.5 — the one place that generates text.
 *
 * This file contains ONE generation loop and nothing else. The buffered path and
 * the streamed path differ only in how the caller consumes it:
 *
 *   buffered  →  for await (…) full += piece      (Chapter 07 §07.1)
 *   streamed  →  yield piece                      (Chapter 07 §07.2)
 *
 * Everything downstream (the pump, the transports, the codec) is provider-agnostic;
 * only this file knows about the network.
 */

const client = new OpenAI({
  apiKey: config.AI_API_KEY || 'not-needed', // Ollama runs locally and needs none
  baseURL: config.AI_ENDPOINT,
  maxRetries: 0,
  timeout: 60_000,
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Chapter 01 §01.5 / §01.7 — with no provider key the lab runs in OFFLINE mode.
 * The whole pipeline (the pump, both transports, the codec, the metrics) still
 * runs end to end against a deterministic stub, so the notes are studyable with
 * zero spend.
 */
export const isOffline = (): boolean => config.AI_PROVIDER !== 'ollama' && !config.AI_API_KEY;

/**
 * A deterministic stand-in, NOT a model.
 *
 * It deliberately contains 1-, 2-, 3- and 4-byte UTF-8 characters (`A`, `é`, `₹`, `😀`)
 * so the codec endpoints have real material to split (chapter 04 §04.4), and it is
 * split into word-sized deltas so you can see that a delta is not a token.
 */
const offlineReply = (message: string): string =>
  'Streaming changes delivery, not generation. ' +
  'The model emits one token at a time and the backend forwards it without buffering. ' +
  'Multi-byte safety matters: ₹500, café, naïve, 日本語 and 😀. ' +
  `You asked: "${message.slice(0, 60)}".`;

/**
 * Chapter 01 §01.3 — the cadence the application cannot change:
 * a one-off PREFILL delay (which sets TTFT), then serial DECODE steps (which set TPS).
 */
const offlineDeltas = async function* (message: string): AsyncGenerator<string> {
  await sleep(config.OFFLINE_TTFT_MS); // prefill — the parallel pass over the prompt
  for (const piece of offlineReply(message).match(/\S+\s*/g) ?? []) {
    await sleep(config.OFFLINE_ITL_MS); // one decode step per piece
    yield piece;
  }
};

/**
 * Chapter 07 §07.2 — the streaming service: a handle to a time-series, not a value.
 *
 * It does not buffer, join or assemble. It exposes deltas, and it fills `usage`
 * when the provider finally reports it (chapter 09 §09.5 — usage is not known
 * until generation ends).
 *
 * The `signal` is what stops orphaned generation when the client disconnects
 * (chapter 06 §06.6).
 */
export async function* providerStream(
  messages: ChatTurn[],
  usage: Usage,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (isOffline()) {
    usage.promptTokens = estimate(messages.map((turn) => turn.content).join('\n'));
    let completion = '';
    for await (const delta of offlineDeltas(messages[messages.length - 1]?.content ?? '')) {
      completion += delta;
      yield delta;
    }
    usage.completionTokens = estimate(completion);
    return;
  }

  const stream = await client.chat.completions.create(
    {
      model: config.AI_MODEL,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: config.AI_TEMPERATURE,
      max_tokens: config.AI_MAX_TOKENS,
      stream: true,
      // Chapter 09 §09.5 — ask for usage in the final frame, then reconcile.
      stream_options: { include_usage: true },
    },
    { signal },
  );

  for await (const chunk of stream) {
    if (chunk.usage) {
      usage.promptTokens = chunk.usage.prompt_tokens;
      usage.completionTokens = chunk.usage.completion_tokens;
    }
    const delta = chunk.choices[0]?.delta?.content ?? '';
    // Chapter 02 §02.4 — the first frame often carries an empty delta (role only),
    // and the usage frame has no choices at all. Neither is text.
    if (!delta) continue;
    yield delta;
  }
}

/**
 * Chapter 09 §09.5 — the ±10-15% estimator: characters ÷ average chars-per-token.
 * Good enough for live progress and in-stream budgeting; reconcile with `usage`
 * at the end and never let a missing usage break the ledger.
 */
export const estimate = (text: string): number => Math.ceil(text.length / 4);
```

---

## 3.4 Block by block

**The header comment is the design.** There is one loop; there are two consumers. Chapter 01 §01.5 states
this as a one-line truth ("the same loop with the accumulator replaced by an async iterator"), and this lab
makes it literal: `chatBuffered` in chapter 07 accumulates the *same* `providerStream` output that the SSE
endpoint forwards.

**`isOffline()` — one predicate, and the whole lab becomes free.** Note the exact condition:
`config.AI_PROVIDER !== 'ollama' && !config.AI_API_KEY`. A local Ollama server needs no key, so it is *not*
offline; a cloud provider with no key *is*. Without this, "no key" would be an error path instead of a
learning path.

**`offlineReply()` is engineered for the codec, not for realism.** It contains `₹` (3 bytes), `é`/`ï`
(2 bytes), `😀` (4 bytes) and plain ASCII (1 byte). That single string makes the chapter 04 experiments
non-trivial: if the payload were all ASCII, a per-byte `TextDecoder` would look perfectly correct.

**`offlineDeltas` models the two phases of chapter 01 §01.3 — in two lines of code.**

```ts
await sleep(config.OFFLINE_TTFT_MS);                                          // prefill → sets TTFT
for (const piece of …) { await sleep(config.OFFLINE_ITL_MS); yield piece; }   // decode  → sets TPS
```

The first `sleep` is the honest stand-in for prefill: nothing can be delivered during it, no matter how good
your delivery layer is. The per-piece `sleep` is the serial decode step, and 1000 ÷ 25 = 40 tokens/s — well
above the ~8 tokens/s a human reads (chapter 03 §03.3).

**The delta split is `/\S+\s*/g`, not "one word = one token".** That is deliberate: it produces deltas that
are *not* tokens, which is exactly the point of chapter 04 §04.2. It also keeps the trailing space attached,
so concatenating the deltas reproduces the text exactly — the property the torture test later asserts.

**`providerStream` takes a `usage` holder instead of returning usage.** Chapter 09 §09.5 says usage arrives
in a *final* frame — or not at all. A generator cannot hand a return value back to a `for await` loop, so the
caller passes a mutable object and the generator fills it. That is the smallest honest shape for "you will
not know until the end".

**`if (!delta) continue;` — the two empty frames of chapter 02 §02.4.** The first streamed frame is usually a
role-only declaration with `content: ""`, and the usage frame carries no `choices` at all. A client that
treats the first *frame* as the first *text* creates an empty bubble; this `continue` is that bug, prevented.

**`stream_options: { include_usage: true }` — the reconciliation half of chapter 09 §09.5.** We estimate
during the stream and overwrite the estimate the moment the provider tells us the truth. If a provider does
not support the option, nothing breaks: the estimate survives and the lab keeps working.

**`estimate()` is deliberately crude.** `Math.ceil(text.length / 4)` is the "characters ÷ average
chars-per-token" row of the chapter 09 §09.5 table — ±10–15%, free, and correct enough for a live token
counter. Being visibly approximate is better pedagogy than hiding a real tokenizer behind a dependency.

---

## 3.5 Verifying this chapter

```bash
# OFFLINE mode, with the prefill/decode cadence visible
curl -sN -X POST http://localhost:8097/api/chat/stream \
  -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch03","message":"hello"}' | head -c 120

# The same text as a buffered answer — identical bytes, different delivery
curl -s -X POST http://localhost:8097/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"conversationId":"ch03b","message":"hello"}' | python3 -m json.tool | head -12
```

The first command prints text progressively (about 250 ms of silence, then words every 25 ms). The second
prints nothing until the whole answer exists — and then prints `serverFirstDeltaMs` next to
`clientSeesTextAtMs`, which is chapter 02 §02.2 measured rather than argued.

---

**Previous:** [Chapter 02 — Config & Types](./02_Config_and_Types.md) ·
**Next:** [Chapter 04 — The Stream Pump](./04_The_Stream_Pump_Coalescing_and_Backpressure.md)