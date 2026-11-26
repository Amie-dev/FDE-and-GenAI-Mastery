import { z } from 'zod';

/**
 * Chapter 02 — boot-time configuration.
 *
 * Every knob the service has is declared ONCE, here, with a range and a default.
 * A misconfigured deployment must fail at boot with a list of problems, never
 * limp into production and fail on request 10 000 (chapter 09 §09.8).
 */

/** Chapter 04 §04.5.1 — the provider endpoints. All three speak the OpenAI dialect. */
export const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
} as const;

/** Chapter 04 §04.3 — the enforcement ladder, strongest first. The order IS the policy. */
export const ENFORCEMENT_LADDER = ['native_schema', 'tool_use', 'json_mode', 'instruction'] as const;
export type EnforcementName = (typeof ENFORCEMENT_LADDER)[number];

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8200),
  SERVICE_NAME: z.string().min(1).default('lecture-10-structured-outputs'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // ── Provider ──────────────────────────────────────────────────────────────
  AI_PROVIDER: z.enum(['openai', 'groq', 'ollama']).default('openai'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0),
  /** Chapter 04 §04.4 — `auto` = the strongest rung the model supports. */
  ENFORCEMENT: z.enum(['auto', ...ENFORCEMENT_LADDER]).default('auto'),
  /** Chapter 05 §05.8 — declared so the operator owns the cost ceiling. */
  MAX_OUTPUT_TOKENS: z.coerce.number().int().min(64).max(4_096).default(700),
  PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(500).max(120_000).default(20_000),

  // ── Reliability loop (chapter 06 §06.7) ───────────────────────────────────
  MAX_REPAIRS: z.coerce.number().int().min(0).max(3).default(2),
  /** Chapter 06 §06.3.1 — transport retries, separate from repairs. */
  MAX_TRANSPORT_RETRIES: z.coerce.number().int().min(0).max(5).default(3),
  RETRY_BASE_DELAY_MS: z.coerce.number().int().min(10).max(5_000).default(150),
  /** Chapter 09 §09.5.2 — the circuit breaker that protects a failing provider. */
  CIRCUIT_FAILURE_THRESHOLD: z.coerce.number().int().min(1).max(100).default(5),
  CIRCUIT_RESET_MS: z.coerce.number().int().min(1_000).default(30_000),

  // ── Semantic policy (chapter 06 §06.6) ────────────────────────────────────
  POLICY_MAX_DURATION_MINUTES: z.coerce.number().int().positive().default(240),
  POLICY_MAX_DURATION_DAYS: z.coerce.number().int().positive().default(30),

  // ── Caching (chapter 05 §05.8.1) ──────────────────────────────────────────
  CACHE_ENABLED: z.coerce.boolean().default(true),
  CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(5_000),
  CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),

  // ── HTTP hardening ────────────────────────────────────────────────────────
  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(8_000),
  BODY_LIMIT: z.string().min(1).default('256kb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  // ── Observability (chapter 09 §09.6) ─────────────────────────────────────
  TRACE_BUFFER_SIZE: z.coerce.number().int().positive().default(1_000),
  /** Chapter 09 §09.6 — raw text is never logged; this bounds the opt-in debug store. */
  DEBUG_STORE_ENABLED: z.coerce.boolean().default(false),
  DEBUG_STORE_MAX_ENTRIES: z.coerce.number().int().positive().default(200),

  // ── Credentials ───────────────────────────────────────────────────────────
  OPENAI_API_KEY: z.string().default(''),
  GROQ_API_KEY: z.string().default(''),
  OLLAMA_BASE_URL: z.string().default(PROVIDER_ENDPOINTS.ollama),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // A deployment with a bad configuration must not start. Print everything.
  const problems = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
  console.error(`✖ invalid configuration:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

const env = parsed.data;

const KEY_FOR: Record<Env['AI_PROVIDER'], 'OPENAI_API_KEY' | 'GROQ_API_KEY' | ''> = {
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
  ollama: '',
};

/**
 * Chapter 05 §05.8.1 — the API key is DERIVED from the provider, so it is
 * impossible to point at one provider while carrying another's credential.
 */
const apiKeyFor = (provider: Env['AI_PROVIDER']): string => {
  const name = KEY_FOR[provider];
  return name ? env[name] : '';
};

export const config = Object.freeze({
  ...env,
  AI_ENDPOINT: env.AI_PROVIDER === 'ollama' ? env.OLLAMA_BASE_URL : PROVIDER_ENDPOINTS[env.AI_PROVIDER],
  AI_API_KEY: apiKeyFor(env.AI_PROVIDER),
});

export type AppConfig = typeof config;

/**
 * Chapter 06 §06.6 — the policy and reliability groups, lifted out of the
 * environment so the rest of the code reads as decisions rather than lookups.
 */

/**
 * Chapter 09 §09.2 — the semantic policy as data, so a product owner can review
 * the numbers without reading the rules (chapter 06 §06.6).
 */
export const POLICY = Object.freeze({
  maxDurationMinutes: config.POLICY_MAX_DURATION_MINUTES,
  maxDurationDays: config.POLICY_MAX_DURATION_DAYS,
  reviewDurationMinutes: config.POLICY_MAX_DURATION_MINUTES,
  /** Chapter 06 §06.6.1 — a below-minimum duration for an interview is a hard block. */
  minInterviewMinutes: 30,
});

export const RELIABILITY = Object.freeze({
  maxRepairs: config.MAX_REPAIRS,
  maxTransportRetries: config.MAX_TRANSPORT_RETRIES,
  retryBaseDelayMs: config.RETRY_BASE_DELAY_MS,
  circuitFailureThreshold: config.CIRCUIT_FAILURE_THRESHOLD,
  circuitResetMs: config.CIRCUIT_RESET_MS,
  providerTimeoutMs: config.PROVIDER_TIMEOUT_MS,
  maxOutputTokens: config.MAX_OUTPUT_TOKENS,
});

export const CACHE = Object.freeze({
  enabled: config.CACHE_ENABLED,
  maxEntries: config.CACHE_MAX_ENTRIES,
  ttlMs: config.CACHE_TTL_MS,
});

export const OBSERVABILITY = Object.freeze({
  traceBufferSize: config.TRACE_BUFFER_SIZE,
  debugStoreEnabled: config.DEBUG_STORE_ENABLED,
  debugStoreMaxEntries: config.DEBUG_STORE_MAX_ENTRIES,
});

export const HTTP = Object.freeze({
  bodyLimit: config.BODY_LIMIT,
  rateLimitWindowMs: config.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: config.RATE_LIMIT_MAX,
  maxInputChars: config.MAX_INPUT_CHARS,
});

