/**
 * Lecture 14 — Basic code configuration.
 * Reads environment variables with sensible defaults.
 */

export const config = {
  port: Number(process.env.PORT) || 3000,
};