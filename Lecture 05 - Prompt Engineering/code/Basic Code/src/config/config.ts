import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Chapter 01 / 07 — the canonical instruction ordering.
 * Trusted rules first, untrusted DATA last: that is what the assembler in
 * `services/hygiene.service.ts` follows, and what keeps the prompt cacheable.
 */
export const SLOT_ORDER = ['role', 'task', 'constraints', 'contract', 'data'] as const;

/** Chapter 06 — the endpoint per provider. Both speak the OpenAI wire dialect. */
export const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
} as const;

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8080),
  AI_PROVIDER: z.enum(['openai', 'groq', 'ollama']).default('openai'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  // Chapter 02 — temperature 0 is the debugging default: it removes sampling as
  // an explanation for a behaviour change, so an evaluation measures the prompt.
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(400),
  // Chapter 08 — input guardrail: the largest untrusted payload we accept.
  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(8_000),
  OPENAI_API_KEY: z.string().default(''),
  GROQ_API_KEY: z.string().default(''),
  OLLAMA_BASE_URL: z.string().default(PROVIDER_ENDPOINTS.ollama),
});

/** Which key belongs to which provider. Ollama runs locally, so it has none. */
const KEY_FOR: Record<string, 'OPENAI_API_KEY' | 'GROQ_API_KEY' | ''> = {
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
  ollama: '',
};

const parsed = envSchema.safeParse(process.env);

// Chapter 08 — fail fast, fail loud: a bad deploy dies at boot, not on request one.
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

/** The endpoint actually in use, so `/api/health` can show the live wiring. */
const activeEndpoint = (): string =>
  env.AI_PROVIDER === 'ollama' ? env.OLLAMA_BASE_URL : PROVIDER_ENDPOINTS[env.AI_PROVIDER];

/** The credential for the active provider — empty for Ollama. */
const activeApiKey = (): string => {
  const name = KEY_FOR[env.AI_PROVIDER];
  return name ? env[name] : '';
};

/** Frozen boot-time configuration — nothing drifts at runtime. */
export const config = Object.freeze({
  ...env,
  AI_ENDPOINT: activeEndpoint(),
  AI_API_KEY: activeApiKey(),
});

export type Config = typeof config;
