import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/config.js';

/**
 * Chapter 02 §02.8 — validate BEFORE the first byte.
 *
 * Streaming changes failure semantics: once `200 OK` and the first chunk have
 * left the server the status is frozen (chapter 07 §07.7). So everything that
 * could be a 400 must be a 400 *now*, not an in-band error later.
 */

/** Chapter 02 §02.8 — the request shape is the first thing to reject. */
export const chatRequestSchema = z.object({
  conversationId: z.string().min(1).max(120),
  message: z.string().min(1).max(config.MAX_INPUT_CHARS),
});

/**
 * Chapter 04 §04.6 — the fragmentation mode. `byte` is the one that proves a
 * client is transport-independent; a number is a fixed fragment size.
 */
const chunkSizeSchema = z.union([
  z.enum(['whole', 'char', 'byte', 'random', 'newline']),
  z.coerce.number().int().min(1).max(4096),
]);

/**
 * Chapter 04 §04.4 — a multi-byte payload is required to make the point, so the
 * default contains 1-, 2-, 3- and 4-byte characters. Single-line only: an SSE
 * `data:` frame cannot carry a raw newline.
 */
const codecPayloadSchema = z
  .string()
  .min(1)
  .max(4000)
  .refine((value) => !/[\r\n]/.test(value), { message: 'Use a single-line payload for the codec endpoints.' });

export const decodeRequestSchema = z.object({
  text: codecPayloadSchema.default('Spring ₹500 café naïve 日本語 😀'),
  chunkSize: chunkSizeSchema.default('byte'),
});

export const framesRequestSchema = z.object({
  text: codecPayloadSchema.default('Spring ₹500 café naïve 日本語 😀'),
  chunkSize: chunkSizeSchema.default('byte'),
});

export const tortureRequestSchema = z.object({
  text: codecPayloadSchema.default('Spring ₹500 café naïve 日本語 😀'),
  seed: z.coerce.number().int().min(0).default(42),
});

/** One validation layer for every route. */
export const validateBody =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }

    req.body = parsed.data;
    next();
  };
