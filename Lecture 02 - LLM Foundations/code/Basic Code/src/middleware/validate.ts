import type { Request } from "express";
import type { PromptPart } from "../types";
import { badRequest } from "./errorHandler";

/**
 * Request-body helpers. They exist so every controller can answer the same way
 * when a field is missing: a clear 400 instead of a crash deep inside a service.
 */

const PART_NAMES: PromptPart["name"][] = ["system", "tools", "user", "context", "history"];

/** `{ "text": "..." }` - the shape almost every endpoint here needs. */
export function requireText(req: Request, field = "text"): string {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badRequest(`Body must contain "${field}" as a non-empty string.`);
  }
  return value;
}

/** An optional number, with a default. `{ "maxTokens": 8 }` */
export function optionalNumber(req: Request, field: string, fallback: number, min = 1, max = 4096): number {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  if (value === undefined || value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw badRequest(`"${field}" must be a number between ${min} and ${max}.`);
  }
  return Math.floor(parsed);
}

/** An optional non-empty string array, with a default. `{ "corpus": ["low", "lower"] }` */
export function optionalStringArray(req: Request, field: string, fallback: string[]): string[] {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  if (value === undefined || value === null) return fallback;
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string")) {
    throw badRequest(`"${field}" must be a non-empty array of strings.`);
  }
  return value as string[];
}

/**
 * The tokenizer a request asked for: a model id or an encoding name, in one string.
 * Every counting endpoint takes it, because a count means nothing without the
 * vocabulary it was measured in (§02.3).
 */
export function optionalTokenizer(req: Request): string | undefined {
  const body = (req.body ?? {}) as { model?: unknown; encoding?: unknown };
  if (typeof body.model === "string" && body.model.trim().length > 0) return body.model;
  if (typeof body.encoding === "string" && body.encoding.trim().length > 0) return body.encoding;
  return undefined;
}

/**
 * A prompt, part by part: either the explicit form
 *   { "parts": [{ "name": "system", "text": "..." }, { "name": "user", "text": "..." }] }
 * or the short form `{ "text": "..." }`, which is treated as the user's message.
 */
export function requireParts(req: Request): { name: PromptPart["name"]; text: string }[] {
  const body = req.body as { parts?: unknown; text?: unknown } | undefined;

  if (Array.isArray(body?.parts) && body.parts.length > 0) {
    return body.parts.map((part) => {
      const candidate = part as { name?: unknown; text?: unknown };
      if (!PART_NAMES.includes(candidate.name as PromptPart["name"]) || typeof candidate.text !== "string") {
        throw badRequest(`Each part needs {"name": one of ${PART_NAMES.join(" | ")}, "text": "..."}.`);
      }
      return { name: candidate.name as PromptPart["name"], text: candidate.text };
    });
  }

  if (typeof body?.text === "string" && body.text.trim().length > 0) {
    return [{ name: "user", text: body.text }];
  }

  throw badRequest('Send either {"text": "..."} or {"parts": [{"name": "system", "text": "..."}]}.');
}
