import type { Request, Response } from "express";
import { asyncHandler, badRequest } from "../middleware/errorHandler";
import { optionalStringArray, optionalTokenizer, requireText } from "../middleware/validate";
import * as tokenizer from "../services/tokenizerService";

/**
 * Chapter 02 - the text pipeline over HTTP, backed by a real tokenizer.
 * Controllers stay thin: read the body, call one service, shape the response.
 */

/** POST /api/tokenizer/encode   { "text": "...", "chat": false, "model" | "encoding"?: "gpt-4o" } */
export const encode = asyncHandler((req: Request, res: Response) => {
  const text = requireText(req);
  const chat = (req.body as { chat?: unknown }).chat === true;
  const input = optionalTokenizer(req);
  const encoded = chat ? tokenizer.encodeChat(text, input) : tokenizer.encode(text, input);

  res.json({
    ...encoded,
    chat,
    // Shown next to the raw text so you can see what silent normalisation would cost you.
    normalized: tokenizer.normalize(text),
    vocabularySize: tokenizer.vocabularySize(input),
    note: "IDs are labels, not measurements: id 3 is not 'bigger' than id 2, and they are not portable to another model (§02.3).",
  });
});

/** POST /api/tokenizer/decode   { "ids": [...], "model" | "encoding"?: "gpt-4o" } */
export const decode = asyncHandler((req: Request, res: Response) => {
  const ids = (req.body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "number")) {
    throw badRequest('Body must contain "ids" as an array of numbers, e.g. {"ids": [1824, 3139, 315]}.');
  }

  const input = optionalTokenizer(req);
  const numericIds = ids as number[];

  res.json({
    ids: numericIds,
    encoding: tokenizer.resolveEncoding(input).name,
    tokens: numericIds.map((id) => tokenizer.pieceOf(id, input)),
    text: tokenizer.decode(numericIds, input),
    note: "Decode the WHOLE buffer, never one token at a time: a token boundary is not a word boundary (§02.7).",
  });
});

/**
 * POST /api/tokenizer/compare   { "text": "...", "models"?: ["gpt-4o", "claude-3-5-sonnet"] }
 * The roadmap's build task for this lecture, as an endpoint: the same text through more
 * than one tokenizer, with `exact` telling you which counts are the provider's own.
 */
export const compare = asyncHandler((req: Request, res: Response) => {
  const text = requireText(req);
  const models = optionalStringArray(req, "models", [...tokenizer.ENCODING_NAMES]);
  res.json(tokenizer.compare(text, models));
});
