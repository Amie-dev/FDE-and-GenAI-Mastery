import type { Request } from "express";
import type { DecodingSettings, MaskKind } from "../types";
import { badRequest } from "./errorHandler";

/**
 * Request-body helpers. They exist so every controller can answer the same way
 * when a field is missing: a clear 400 instead of a crash deep inside a service.
 */

/** `{ "tokens": ["The", "cat", "sat"] }` - the shape most attention endpoints need. */
export function requireTokens(req: Request, field = "tokens", max = 12): string[] {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string")) {
    throw badRequest(`Body must contain "${field}" as a non-empty array of strings, e.g. ["The","cat","sat"].`);
  }
  if (value.length > max) {
    throw badRequest(`"${field}" may hold at most ${max} tokens - this is a by-hand demo, not a production server.`);
  }
  return value as string[];
}

/** An optional token array, with a default. `{ "sentenceA": ["it","was","too","tired"] }` */
export function optionalTokens(req: Request, field: string, fallback: string[], max = 12): string[] {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  if (value === undefined || value === null) return fallback;
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string")) {
    throw badRequest(`"${field}" must be a non-empty array of strings.`);
  }
  if (value.length > max) throw badRequest(`"${field}" may hold at most ${max} tokens.`);
  return value as string[];
}

/** The model shape a request asked for, falling back to the configured one. */
export function shapeId(req: Request): string | undefined {
  const value = (req.body as Record<string, unknown> | undefined)?.shape;
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

/** A required string. `{ "word": "it" }` */
export function requireString(req: Request, field: string): string {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badRequest(`Body must contain "${field}" as a non-empty string.`);
  }
  return value;
}

/** An optional string, with a default. `{ "word": "it" }` */
export function optionalString(req: Request, field: string, fallback: string): string {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badRequest(`"${field}" must be a non-empty string.`);
  }
  return value;
}

/** An optional non-empty array of numbers. `{ "logits": [5, 4, 3, 2, 1] }` */
export function optionalNumberArray(req: Request, field: string, fallback: number[]): number[] {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  if (value === undefined || value === null) return fallback;
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => !Number.isFinite(Number(item)))) {
    throw badRequest(`"${field}" must be a non-empty array of numbers, e.g. [5,4,3,2,1].`);
  }
  return (value as unknown[]).map(Number);
}

/** An optional number inside a range. `{ "temperature": 0.7 }` */
export function optionalNumber(req: Request, field: string, fallback: number, min = 0, max = 1000): number {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  if (value === undefined || value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw badRequest(`"${field}" must be a number between ${min} and ${max}.`);
  }
  return parsed;
}

/** An optional integer inside a range. `{ "topK": 3 }` */
export function optionalInteger(req: Request, field: string, fallback: number | null, min = 1, max = 1000): number | null {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  if (value === undefined || value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw badRequest(`"${field}" must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

/** An optional string from a fixed list. `{ "mask": "causal" }` */
export function optionalChoice<T extends string>(req: Request, field: string, allowed: readonly T[], fallback: T): T {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw badRequest(`"${field}" must be one of ${allowed.join(" | ")}.`);
  }
  return value as T;
}

/** The mask a request asked for (ch03 §03.5, ch09 §09.6). */
export const requireMask = (req: Request): MaskKind =>
  optionalChoice(req, "mask", ["none", "causal", "sliding", "padding"] as const, "causal");

/** The whole decoding configuration, with every default filled in (ch08 §08.10). */
export function requireSettings(req: Request, defaults: { temperature: number; topP: number; seed: number }): DecodingSettings {
  const topK = optionalInteger(req, "topK", null, 1, 1000);
  const minP = optionalNumber(req, "minP", 0, 0, 1);
  return {
    strategy: optionalChoice(req, "strategy", ["greedy", "beam", "sample"] as const, "sample"),
    temperature: optionalNumber(req, "temperature", defaults.temperature, 0, 10),
    topK,
    topP: optionalNumber(req, "topP", topK === null ? defaults.topP : 0, 0, 1) || null,
    minP: minP > 0 ? minP : null,
    repetitionPenalty: optionalNumber(req, "repetitionPenalty", 1, 0, 10),
    frequencyPenalty: optionalNumber(req, "frequencyPenalty", 0, 0, 10),
    presencePenalty: optionalNumber(req, "presencePenalty", 0, 0, 10),
    seed: optionalInteger(req, "seed", defaults.seed, 0, 2 ** 31) ?? defaults.seed,
  };
}
