import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Chapter 02 — the four invariant components of every LLM call:
 * endpoint, authentication, model and input defaults. They live here, in one place.
 */
export const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  mistral: 'https://api.mistral.ai/v1',
  ollama: 'http://localhost:11434/v1',
} as const;

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8080),
  AI_PROVIDER: z.enum(['openai', 'groq', 'mistral', 'ollama', 'gemini']).default('openai'),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(400),
  AI_MAX_INPUT_TOKENS: z.coerce.number().int().positive().default(8000),
  OPENAI_API_KEY: z.string().default(''),
  GROQ_API_KEY: z.string().default(''),
  MISTRAL_API_KEY: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  OLLAMA_BASE_URL: z.string().default(PROVIDER_ENDPOINTS.ollama),
});

/** Which key belongs to which provider. Ollama runs locally, so it has none. */
const KEY_FOR: Record<string, 'OPENAI_API_KEY' | 'GROQ_API_KEY' | 'MISTRAL_API_KEY' | 'GEMINI_API_KEY' | ''> = {
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  gemini: 'GEMINI_API_KEY',
  ollama: '',
};

const parsed = envSchema.safeParse(process.env);

// Chapter 08 — fail fast, fail loud: a bad deploy dies at boot, not on the first request.
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;
const requiredKey = KEY_FOR[env.AI_PROVIDER];

if (requiredKey && !env[requiredKey]) {
  console.error(`❌ AI_PROVIDER=${env.AI_PROVIDER} requires ${requiredKey} in .env`);
  process.exit(1);
}

/** The endpoint actually used, so `/api/health` can show the live wiring. */
const activeEndpoint = (): string => {
  if (env.AI_PROVIDER === 'ollama') return env.OLLAMA_BASE_URL;
  if (env.AI_PROVIDER === 'gemini') return 'https://generativelanguage.googleapis.com';
  return PROVIDER_ENDPOINTS[env.AI_PROVIDER];
};

/** Frozen boot-time configuration — nothing can drift at runtime (chapter 08). */
export const config = Object.freeze({ ...env, AI_ENDPOINT: activeEndpoint() });

/**
 * Chapter 04 — price per 1M tokens (USD). Prices are data, not code: they change,
 * so they belong in a table you can update without touching business logic.
 */
export const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  default: { input: 0.5, output: 1.5 },
};
