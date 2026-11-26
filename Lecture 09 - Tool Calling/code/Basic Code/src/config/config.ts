import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** Chapter 03 §03.7 — one endpoint per provider. All three speak the OpenAI dialect. */
export const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
} as const;

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8098),

  // Chapter 07 §07.2 — the routing policy. `auto` is the only policy that lets
  // the model answer "I don't need a tool", which is often the right answer.
  AI_PROVIDER: z.enum(['openai', 'groq', 'ollama']).default('openai'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(500), // B_output
  TOOL_CHOICE: z.string().default('auto'),

  // Chapter 05 §05.7 — the five brakes. Every one of them is a separate failure.
  MAX_STEPS: z.coerce.number().int().min(1).max(20).default(6),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(60_000),
  TOKEN_CEILING: z.coerce.number().int().positive().default(60_000),
  REPEATED_CALL_LIMIT: z.coerce.number().int().min(1).default(2),

  // Chapter 04 §04.9 — operational policy per tool family.
  TOOL_TIMEOUT_MS: z.coerce.number().int().min(100).default(8_000),
  CACHE_TTL_MS: z.coerce.number().int().min(0).default(300_000),
  MAX_CALLS_PER_STEP: z.coerce.number().int().min(1).max(16).default(4),

  // Chapter 06 §06.5 — the request shape is the first thing to validate.
  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(2_000),

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
 * Chapter 05 §05.7.1 — the loop brakes, in one object so the engine stays thin.
 * Nesting rule: tool timeout ⊂ retry budget ⊂ request deadline.
 */
export const BRAKES = Object.freeze({
  maxSteps: config.MAX_STEPS,
  requestTimeoutMs: config.REQUEST_TIMEOUT_MS,
  tokenCeiling: config.TOKEN_CEILING,
  repeatedCallLimit: config.REPEATED_CALL_LIMIT,
});

/** Chapter 04 §04.9 — per-tool operational policy. */
export const TOOL_POLICY = Object.freeze({
  defaultTimeoutMs: config.TOOL_TIMEOUT_MS,
  cacheTtlMs: config.CACHE_TTL_MS,
  maxCallsPerStep: config.MAX_CALLS_PER_STEP,
});

/** Chapter 08 §08.2 — the tier that cannot auto-execute. */
export const APPROVAL_REQUIRED_TIER = 'critical' as const;

export type Config = typeof config;
