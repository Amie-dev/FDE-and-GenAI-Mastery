import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** Chapter 05 §05.5 — one endpoint per provider. All three speak the OpenAI dialect. */
export const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
} as const;

/**
 * Chapter 05 §05.7 — the enforcement ladder, strongest first.
 *
 * Read the ladder as the answer to one question: *what does the decoder
 * enforce, and what is left to me?* Nothing below `native_schema` removes the
 * need for the validator — which is why `extraction.service.ts` validates on
 * every path.
 */
export const ENFORCEMENT_LADDER = ['native_schema', 'json_mode', 'instruction'] as const;

export type EnforcementName = (typeof ENFORCEMENT_LADDER)[number];

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8100),

  // Chapter 05 §05.5 — which model, and therefore which enforcement is available.
  AI_PROVIDER: z.enum(['openai', 'groq', 'ollama']).default('openai'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  // Chapter 03 §03.3.1 — extraction wants determinism, not creativity.
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0),

  // Chapter 05 §05.7 — `auto` = strongest rung the provider supports.
  ENFORCEMENT: z.enum(['auto', ...ENFORCEMENT_LADDER]).default('auto'),

  // Chapter 03 §03.2 failure #11 — truncation is a known failure, so budget for it.
  MAX_TOKENS: z.coerce.number().int().min(64).default(700),

  // Chapter 06 §06.7.1 — bound the loop. Unbounded repairs cost money and delay failure.
  MAX_REPAIRS: z.coerce.number().int().min(0).max(3).default(2),

  // Chapter 06 §06.6 — semantic policy the schema cannot express.
  POLICY_MAX_DURATION_MINUTES: z.coerce.number().int().positive().default(240),
  POLICY_MAX_DURATION_DAYS: z.coerce.number().int().positive().default(30),

  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(4_000),

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

/** Frozen boot-time configuration — nothing drifts at runtime. */
export const config = Object.freeze({
  ...env,
  AI_ENDPOINT: env.AI_PROVIDER === 'ollama' ? env.OLLAMA_BASE_URL : PROVIDER_ENDPOINTS[env.AI_PROVIDER],
  AI_API_KEY: activeApiKey(),
});

/**
 * Chapter 06 §06.6 — the semantic rules, as data.
 *
 * A semantic rule is anything the schema cannot express: it needs the clock,
 * another system, or another field. Keeping them in one object makes them
 * reviewable, testable and countable.
 */
export const SEMANTIC_POLICY = Object.freeze({
  maxDurationMinutes: config.POLICY_MAX_DURATION_MINUTES,
  maxDurationDays: config.POLICY_MAX_DURATION_DAYS,
  /** §06.6.1 — a duration at or above this is a `review`, not a hard failure. */
  reviewDurationMinutes: config.POLICY_MAX_DURATION_MINUTES,
});

/** Chapter 09 §09.2 — how many traces to keep so the metrics are computable. */
export const REMEMBERED_TRACES = 200;

export type Config = typeof config;
