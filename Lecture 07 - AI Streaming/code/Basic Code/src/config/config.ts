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
