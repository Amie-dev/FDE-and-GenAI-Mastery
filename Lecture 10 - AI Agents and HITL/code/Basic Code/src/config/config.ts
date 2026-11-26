import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** Chapter 03 §03.3.7 — one endpoint per provider. All three speak the OpenAI dialect. */
export const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
} as const;

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8099),

  // Chapter 01 §01.2 — the agency spectrum. Which level this process runs at is a
  // configuration decision, not a code change.
  AGENCY_LEVEL: z.coerce.number().int().min(1).max(4).default(4),

  AI_PROVIDER: z.enum(['openai', 'groq', 'ollama']).default('openai'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),

  // Chapter 04 §04.2–§04.5 — the four brakes.
  MAX_STEPS: z.coerce.number().int().min(1).max(30).default(8),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(60_000),
  TOKEN_CEILING: z.coerce.number().int().positive().default(60_000),
  REPEATED_CALL_LIMIT: z.coerce.number().int().min(1).default(2),
  TOOL_TIMEOUT_MS: z.coerce.number().int().min(100).default(8_000),

  // Chapter 05 §05.4–§05.7 — the jail and its quotas.
  WORKSPACE_ROOT: z.string().min(1).default('./workspace'),
  MAX_FILE_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  MAX_WORKSPACE_BYTES: z.coerce.number().int().positive().default(100 * 1024 * 1024),
  MAX_FILES: z.coerce.number().int().positive().default(500),
  MAX_DEPTH: z.coerce.number().int().positive().default(10),
  MAX_PATH_LENGTH: z.coerce.number().int().positive().default(255),

  // Chapter 07 §07.4.3 — the Tier 3 policy.
  FINANCIAL_THRESHOLD: z.coerce.number().positive().default(5_000),
  APPROVAL_TTL_MS: z.coerce.number().int().positive().default(900_000),

  // Chapter 08 §08.7.3 — the risk bands.
  RISK_ALLOW_MAX: z.coerce.number().int().min(0).max(100).default(29),
  RISK_RESTRICT_MIN: z.coerce.number().int().min(0).max(100).default(60),
  RISK_BLOCK_MIN: z.coerce.number().int().min(0).max(100).default(80),

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

/**
 * Chapter 05 §05.4 — the jail root, ABSOLUTE and canonical from the very first
 * line. `safePath` compares resolved strings against it, so it must not be a
 * relative path that changes meaning with the process's cwd.
 */
export const WORKSPACE_ROOT = path.resolve(process.cwd(), env.WORKSPACE_ROOT);

/** Frozen boot-time configuration — nothing drifts at runtime. */
export const config = Object.freeze({
  ...env,
  WORKSPACE_ROOT,
  AI_ENDPOINT: env.AI_PROVIDER === 'ollama' ? env.OLLAMA_BASE_URL : PROVIDER_ENDPOINTS[env.AI_PROVIDER],
  AI_API_KEY: activeApiKey(),
});

/** Chapter 01 §01.2 — the agency spectrum, as the process describes itself. */
export const AGENCY_SPECTRUM = {
  1: { name: 'Raw foundation LLM', loop: false, tools: 0, note: 'Text in → text out. No sensors, no actuators.' },
  2: { name: 'LLM + single tool', loop: false, tools: 1, note: 'One capability gap closed in one round trip.' },
  3: { name: 'LLM + multi-tool selection', loop: false, tools: 7, note: 'Dynamic routing. One decision per request.' },
  4: { name: 'Autonomous goal-directed agent', loop: true, tools: 7, note: 'Decide → act → observe, until the goal verifies.' },
} as const;

/** Chapter 04 §04.2–§04.5 — the four brakes, in one object so the engine stays thin. */
export const BRAKES = Object.freeze({
  maxSteps: config.MAX_STEPS,
  requestTimeoutMs: config.REQUEST_TIMEOUT_MS,
  tokenCeiling: config.TOKEN_CEILING,
  repeatedCallLimit: config.REPEATED_CALL_LIMIT,
  /** §04.7 — the nesting rule: tool timeout ⊂ request deadline ⊂ token ceiling. */
  toolTimeoutMs: config.TOOL_TIMEOUT_MS,
});

/** Chapter 05 §05.7 — quotas are a security control, not hygiene. */
export const QUOTAS = Object.freeze({
  maxFileBytes: config.MAX_FILE_BYTES,
  maxWorkspaceBytes: config.MAX_WORKSPACE_BYTES,
  maxFiles: config.MAX_FILES,
  maxDepth: config.MAX_DEPTH,
  maxPathLength: config.MAX_PATH_LENGTH,
});

/** Chapter 07 §07.4.3 — the Tier 3 gate's numbers. */
export const TIER_POLICY = Object.freeze({
  financialThreshold: config.FINANCIAL_THRESHOLD,
  approvalTtlMs: config.APPROVAL_TTL_MS,
});

/** Chapter 08 §08.7.3 — the four risk bands. */
export const RISK_BANDS = Object.freeze({
  allowMax: config.RISK_ALLOW_MAX,
  restrictMin: config.RISK_RESTRICT_MIN,
  blockMin: config.RISK_BLOCK_MIN,
});

/**
 * Chapter 05 §05.3 vector 3 — the sensitive-name deny-list.
 * Even inside the jail, these names are refused: writing them is config
 * injection, dependency hijacking or secret leakage.
 */
export const DENIED_NAMES = Object.freeze([
  '.env',
  '.env.local',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'server.ts',
  'config.ts',
  'id_rsa',
  '.git',
]);

export type Config = typeof config;
