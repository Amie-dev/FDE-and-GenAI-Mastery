/**
 * Environment configuration for the server.
 *
 * Loads values from .env (loaded automatically by Node's env module in
 * later steps; here we read them manually for a zero-dependency start).
 *
 * In production you would keep secrets out of code and use a real dotenv
 * loader.  For this basic demo there is only one value: the port.
 */

export interface EnvConfig {
  port: number;
  // In a real run these would point at an embedding provider.
  // The basic demo seeds vectors, so these are off by default.
  // embeddingBaseUrl: string;
  // embeddingModel: string;
}

function readEnv(key: string, fallback: string): string {
  const value = process.env[key] ?? process.env[key.toUpperCase()] ?? fallback;
  return value;
}

export const envConfig: EnvConfig = {
  port: Number(readEnv("PORT", "3000")) || 3000,
  // embeddingBaseUrl: readEnv("EMBEDDING_BASE_URL", ""),
  // embeddingModel: readEnv("EMBEDDING_MODEL", "text-embedding-3-small"),
};