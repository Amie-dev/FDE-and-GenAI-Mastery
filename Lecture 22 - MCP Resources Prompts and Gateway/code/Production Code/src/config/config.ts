import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

/**
 * Production config: a single, validated source of truth.
 *
 * The Zod schema below fails loudly at import time if a required variable is
 * missing or malformed — there are no silent `undefined` values in production
 * config.
 *
 * `hasModelKey` is a deliberate escape-hatch: when no key is present the client
 * prints the prompt text instead of calling an LLM, so the whole protocol is
 * observable offline (Lecture 09 security point: no credential, no call).
 */

const envSchema = z.object({
  MCP_PORT: z.coerce.number().min(1).max(65535).default(8081),
  HOST_PORT: z.coerce.number().min(1).max(65535).default(8080),
  MCP_SERVER_URL: z.string().url().default("http://127.0.0.1:8081/mcp"),
  OPENAI_API_KEY: z.string().optional(),
  MODEL: z.string().default("gpt-4.1-mini"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

const env = envSchema.parse(process.env);

export const serverInfo = { name: "task-mcp-server", version: "1.0.0" as const };

export const mcpPort = env.MCP_PORT;
export const hostPort = env.HOST_PORT;
export const mcpServerUrl = env.MCP_SERVER_URL;
export const model = env.MODEL;
export const logLevel = env.LOG_LEVEL;

export const hasModelKey = Boolean(env.OPENAI_API_KEY);

/**
 * Create a Pino logger for a given name.
 *
 * In development, the logger pretty-prints; in production it emits JSON.
 */
export function createLogger(name: string) {
  // Dynamic import so the server can run without pino if needed
  // (pino is a dependency, so this is just a safety net)
  const pino = require("pino");

  return pino({
    name,
    level: logLevel,
    transport: process.env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
  });
}