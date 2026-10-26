# Chapter 02: Config & Types — the Wire Contract

> **Chapter goal:** turn `.env` into a validated, frozen configuration, and define every shape that crosses a
> boundary: the in-band event contract, the metrics row, and the persisted turn.
> **Notes chapters covered:** 03 §03.3 (reading speed), 03 §03.5 (metrics), 05 §05.4 (endpoints),
> 07 §07.6 (pump policy), 07 §07.7 (in-band events), 09 §09.4 (interrupted turns), 09 §09.6 (persistence).

---

## 2.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/config/config.ts` | Zod-validated env → `config` · `PUMP_POLICY` · `READING_TPS` · `PROVIDER_ENDPOINTS` |
| `src/types/streaming.types.ts` | `Role` · `ChatTurn` · `StreamEvent` · `StreamMetrics` · `PersistedTurn` · the three reports |

---

## 2.2 Commands

```bash
npm run typecheck
```

---

## 2.3 `src/config/config.ts` (full file)

```ts
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** Chapter 05 §05.4 — one endpoint per provider. All three speak the OpenAI dialect. */
export const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
} as const;

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8097),

  // Chapter 01 §01.3 — sampling changes WHAT is generated; hardware changes HOW FAST.
  AI_PROVIDER: z.enum(['openai', 'groq', 'ollama']).default('openai'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.3),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(400), // B_output

  // Chapter 07 §07.6 — the stream pump's coalescing policy. Flush on whichever hits first.
  FLUSH_INTERVAL_MS: z.coerce.number().int().min(0).default(40),
  FLUSH_BYTES: z.coerce.number().int().positive().default(256),

  // Chapter 05 §05.3.3 — a no-op every 10-15 s keeps the connection off the idle clock.
  HEARTBEAT_MS: z.coerce.number().int().min(1_000).default(15_000),

  // Chapter 01 §01.3 — the simulated cadence for OFFLINE mode: prefill (TTFT) then decode (ITL).
  OFFLINE_TTFT_MS: z.coerce.number().int().min(0).default(250),
  OFFLINE_ITL_MS: z.coerce.number().int().min(0).default(25),

  // Chapter 02 §02.8 — the request shape is the first thing to validate.
  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(8_000),

  // Chapter 09 §09.7 item 21 — drain in-flight streams instead of truncating them.
  SHUTDOWN_GRACE_MS: z.coerce.number().int().min(0).default(10_000),

  OPENAI_API_KEY: z.string().default(''),
  GROQ_API_KEY: z.string().default(''),
  OLLAMA_BASE_URL: z.string().default(PROVIDER_ENDPOINTS.ollama),
});

const parsed = envSchema.safeParse(process.env);

// Fail fast, fail loud: a bad .env dies at boot, not on request one.
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

/** Which key belongs to which provider. Ollama runs locally, so it has none. */
const KEY_FOR: Record<string, 'OPENAI_API_KEY' | 'GROQ_API_KEY' | ''> = {
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
  ollama: '',
};

const activeApiKey = (): string => {
  const name = KEY_FOR[env.AI_PROVIDER];
  return name ? env[name] : '';
};

/** Chapter 03 §03.3 — human reading speed. Faster than this and the UI is the bottleneck. */
export const READING_TPS = 8;

/** Frozen boot-time configuration — nothing drifts at runtime. */
export const config = Object.freeze({
  ...env,
  AI_ENDPOINT: env.AI_PROVIDER === 'ollama' ? env.OLLAMA_BASE_URL : PROVIDER_ENDPOINTS[env.AI_PROVIDER],
  AI_API_KEY: activeApiKey(),
  READING_TPS,
});

/** Chapter 07 §07.6 — the pump policy, in one object so the controller stays thin. */
export const PUMP_POLICY = Object.freeze({
  flushIntervalMs: config.FLUSH_INTERVAL_MS,
  flushBytes: config.FLUSH_BYTES,
});

export type Config = typeof config;
```

### Block by block

**`PROVIDER_ENDPOINTS` is the whole "multi-provider" story, in four lines.** Chapter 05 §05.4 notes that
OpenAI, Groq and Ollama all speak the same dialect, so switching provider is a base-URL change — no adapter
layer, no second SDK. That is why `AI_ENDPOINT` is *derived* rather than configured.

**`z.coerce.number()` everywhere a number is expected.** Environment variables are always strings;
`coerce` parses them and, crucially, **validates** them. `HEARTBEAT_MS=15s` fails at boot with a readable
message instead of becoming `NaN` at 3 a.m.

**`envSchema.safeParse` + `process.exit(1)` is the fail-fast contract.** Every lecture in this repository
does the same thing, and the reason is specific to streaming: a misconfiguration that only shows up as a
stalled stream is far more expensive to debug than a process that refuses to start.

**`config` is frozen and includes derived values.** `AI_ENDPOINT` and `AI_API_KEY` are computed once, so no
request handler can ever disagree with another about which provider is active.

**`PUMP_POLICY` is a separate export on purpose.** The pump takes its policy as an argument
(`pump(write, deltas, options, signal)`), which keeps `pump.service.ts` testable and transport-agnostic. The
controller is the only place that reads the global config to build that argument.

**`READING_TPS = 8` is a constant, not configuration.** It is a property of humans, not of your deployment
(chapter 03 §03.3), and it is used to label each metrics row `fasterThanReading`.

---

## 2.4 `src/types/streaming.types.ts` (full file)

```ts
/**
 * Lecture 07 — shared types.
 *
 * Every type here makes one notes chapter concrete: a turn, a typed stream
 * event, a metrics row, a persisted turn, a decode/frame/torture report.
 */

/** Chapter 09 §09.1 — one turn exactly as the provider receives it. */
export type Role = 'system' | 'user' | 'assistant';

export interface ChatTurn {
  role: Role;
  content: string;
}

/** Chapter 01 §01.2.4 — why generation stopped. It MUST reach the client. */
export type FinishReason = 'stop' | 'length' | 'error' | 'aborted';

/**
 * Chapter 09 §09.5 — usage is not known until generation ends, so the stream
 * fills this holder: estimate during, reconcile at the end.
 */
export interface Usage {
  promptTokens: number;
  completionTokens: number;
}

/**
 * Chapter 07 §07.7 — the in-band event contract.
 *
 * Once `200 OK` and the first byte have left the server the status is frozen,
 * so every mid-stream signal travels INSIDE the stream as a typed event.
 */
export type StreamEvent =
  | {
      event: 'status';
      data: { phase: 'generating'; model: string; conversationId: string };
    }
  | { event: 'token'; data: { text: string } }
  | { event: 'usage'; data: Usage }
  | { event: 'error'; data: { code: string; message: string; recoverable: boolean } }
  | {
      event: 'done';
      data: { finishReason: FinishReason; ttftMs: number | null; itlMs: number | null };
    };

/**
 * Chapter 03 §03.5 — the numbers you must log, per stream.
 * A single "request took 7.4s" cannot tell you which layer to fix.
 */
export interface StreamMetrics {
  at: number;
  conversationId: string;
  /** Chapter 07 §07.1/§07.2 — the delivery shape, and therefore the return type. */
  transport: 'buffered' | 'raw' | 'sse';
  ttftMs: number | null;
  itlMs: number | null;
  tps: number | null;
  totalMs: number;
  /** Chapter 07 §07.6 — frames written to the socket after coalescing. */
  frames: number;
  chars: number;
  /** Chapter 04 §04.6 — the buffering smoke alarm. */
  charsPerFrame: number;
  promptTokens: number;
  completionTokens: number;
  finishReason: FinishReason;
  aborted: boolean;
  /** Chapter 03 §03.3 — true when TPS already exceeds human reading speed. */
  fasterThanReading: boolean;
}

/** Chapter 09 §09.4 — a partial answer the user already read is still a turn. */
export type TurnStatus = 'complete' | 'length' | 'interrupted';

/** Chapter 09 §09.6 — the persisted turn. One per role per exchange. */
export interface PersistedTurn {
  messageId: string;
  role: Role;
  content: string;
  status: TurnStatus;
  finishReason: FinishReason | null;
  usage: Usage | null;
  createdAt: number;
  firstTokenAt: number | null;
  completedAt: number | null;
}

/** Chapter 09 §09.2 — the conversation store the model does not have. */
export interface Conversation {
  conversationId: string;
  createdAt: number;
  turns: PersistedTurn[];
}

/** Chapter 04 §04.4 — naive vs streaming decode, side by side. */
export interface DecodeReport {
  payload: string;
  byteLength: number;
  chunks: number;
  naive: string;
  streaming: string;
  naiveIsCorrect: boolean;
  streamingIsCorrect: boolean;
}

/** Chapter 04 §04.3/§04.5 — frame reassembly with and without a leftover buffer. */
export interface FrameReport {
  payload: string;
  chunks: number;
  correct: { frames: number; text: string; leftover: string };
  naive: { frames: number; text: string };
  equal: boolean;
}

/** Chapter 04 §04.6 — one row of the fragmentation torture test. */
export interface TortureCase {
  strategy: string;
  mode: 'raw' | 'sse';
  chunks: number;
  ok: boolean;
  actual: string;
  expected: string;
}

export interface TortureReport {
  payload: string;
  cases: TortureCase[];
  ok: boolean;
}
```

### Block by block

**`StreamEvent` is a discriminated union, and that is the whole point.** Chapter 07 §07.7 asks for an
in-band event protocol because the HTTP status cannot change after the first byte. Modelling it as a union
means the compiler refuses to let a handler emit an event the client does not know about — the protocol is
enforced, not documented.

| Event | Chapter | Why it exists |
| :--- | :--- | :--- |
| `status` | 07 §07.7 | the client can show "retrieving / generating" before any text arrives |
| `token` | 04 §04.5 | the only event whose payload is appended to the bubble |
| `usage` | 09 §09.5 | tokens are known only at the end — so it is the *last* data event |
| `error` | 07 §07.7 | a mid-stream failure that cannot be a 500 |
| `done` | 01 §01.2.4 | carries `finishReason`, so "complete" and "cut off" are distinguishable |

**Why `ttftMs` and `itlMs` are `number | null`.** A stream can end before producing a single token (an
error, or an immediate abort). `null` says "there was no first token" instead of the lie that is `0`.

**`StreamMetrics.charsPerFrame` is the metric with no analogue in buffered systems.** Chapter 04 §04.6 gives
the diagnostic table: a healthy stream has a *narrow* distribution of small frames. One enormous frame means
somebody buffered — and because the buffered endpoint in this lab records `frames: 1`, it shows up here as a
`charsPerFrame` in the hundreds. The alarm is real and you can see it.

**`PersistedTurn` carries `firstTokenAt` as well as `createdAt` and `completedAt`.** Chapter 09 §09.6 lists
timestamps as a persistence requirement; with all three, `firstTokenAt − createdAt` *is* the TTFT of that
turn, reconstructible from storage without a metrics pipeline.

**`TurnStatus` has three values, not two.** `complete` and `length` come from `finishReason`; `interrupted`
is the one that matters — chapter 09 §09.4 insists a partial answer the user already read is still part of
the conversation.

---

**Previous:** [Chapter 01 — Project Setup & Environment](./01_Project_Setup_and_Environment.md) ·
**Next:** [Chapter 03 — The Model Layer](./03_The_Model_Layer_Generation_vs_Delivery.md)