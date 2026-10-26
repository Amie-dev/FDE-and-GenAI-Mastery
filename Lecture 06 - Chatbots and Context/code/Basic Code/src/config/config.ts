import dotenv from 'dotenv';
import { z } from 'zod';
import type { ContextPolicy } from '../types/chat.types.js';

dotenv.config();

/** Chapter 05 §05.4 — the endpoint per provider. All three speak the OpenAI dialect. */
export const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
} as const;

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8090),

  // Chapter 01 §01.11 — temperature 0.3 is the support-bot default. Low variance,
  // but NOT a hallucination fix: that is architectural (chapters 06-07).
  AI_PROVIDER: z.enum(['openai', 'groq', 'ollama']).default('openai'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.3),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(600), // B_output

  // Chapter 02 §02.9 — budget against a safe operating limit, never against C_max.
  CONTEXT_WINDOW_TOKENS: z.coerce.number().int().positive().default(128_000), // C_max
  SAFETY_MARGIN: z.coerce.number().min(0).max(0.5).default(0.1), // M_safety
  HISTORY_TIER_SHARE: z.coerce.number().min(0.05).max(0.8).default(0.35), // tier 4

  // Chapter 03 §03.8 — the context-management policy.
  ANCHOR_TURNS: z.coerce.number().int().min(0).default(2), // K
  RECENT_TURNS: z.coerce.number().int().min(1).default(6), // M
  SUMMARISE_THRESHOLD: z.coerce.number().int().min(2).default(8),
  SEMANTIC_RECALL: z.coerce.number().int().min(0).default(3),

  // Chapter 02 §02.9 — tier caps.
  MEMORY_TOP_K: z.coerce.number().int().min(0).default(12),
  RAG_TOP_K: z.coerce.number().int().min(0).default(5),

  // Chapter 07 §07.3 / §07.8 — guardrail thresholds.
  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(8_000),
  CITATION_MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
  // `z.coerce.boolean()` would read the string "false" as true, so parse it explicitly.
  STRICT_VERIFICATION: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  OPENAI_API_KEY: z.string().default(''),
  GROQ_API_KEY: z.string().default(''),
  OLLAMA_BASE_URL: z.string().default(PROVIDER_ENDPOINTS.ollama),
});

const parsed = envSchema.safeParse(process.env);

// Chapter 08 §08.5 — fail fast, fail loud: a bad .env dies at boot, not on request one.
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

/** Chapter 02 §02.9 step 1 — B_input = (C_max − B_output) × (1 − M_safety). */
const INPUT_BUDGET = Math.floor((env.CONTEXT_WINDOW_TOKENS - env.AI_MAX_TOKENS) * (1 - env.SAFETY_MARGIN));

/**
 * Chapter 03 §03.8 — the declarative policy. Only tier 4 (history) is elastic
 * (chapter 02 §02.9), so `budgetTokens` is the history tier's share of B_input.
 */
export const CONTEXT_POLICY: Readonly<ContextPolicy> = Object.freeze({
  budgetTokens: Math.floor(INPUT_BUDGET * env.HISTORY_TIER_SHARE),
  anchorTurns: env.ANCHOR_TURNS,
  recentTurns: env.RECENT_TURNS,
  summarise: true,
  summariseThreshold: env.SUMMARISE_THRESHOLD,
  semanticRecall: env.SEMANTIC_RECALL,
});

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
  INPUT_BUDGET,
});

export type Config = typeof config;
