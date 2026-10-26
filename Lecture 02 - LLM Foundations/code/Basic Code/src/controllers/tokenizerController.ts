import type { Request, Response } from "express";
import { asyncHandler, badRequest } from "../middleware/errorHandler";
import { requireText } from "../middleware/validate";
import * as tokenizer from "../services/tokenizerService";

/**
 * Chapter 02 - the text pipeline over HTTP.
 * Controllers stay thin: read the body, call one service, shape the response.
 */

/** POST /api/tokenizer/encode   { "text": "...", "chat": false } */
export const encode = asyncHandler((req: Request, res: Response) => {
  const text = requireText(req);
  const chat = (req.body as { chat?: unknown }).chat === true;
  const encoded = chat ? tokenizer.encodeChat(text) : tokenizer.encode(text);

  res.json({
    text: tokenizer.normalize(text),
    chat,
    tokens: encoded.tokens,
    ids: encoded.ids,
    offsets: encoded.offsets,
    specialTokensMask: encoded.specialTokensMask,
    roundTrip: tokenizer.decode(encoded.ids),
    vocabularySize: tokenizer.VOCAB_SIZE,
    vocabularySample: tokenizer.VOCABULARY.slice(0, 8),
    note: "IDs are labels, not measurements: id 3 is not 'bigger' than id 2, and they are not portable to another model (§02.3).",
  });
});

/** POST /api/tokenizer/decode   { "ids": [4, 25, 5] } */
export const decode = asyncHandler((req: Request, res: Response) => {
  const ids = (req.body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "number")) {
    throw badRequest('Body must contain "ids" as an array of numbers, e.g. {"ids": [4, 25, 5]}.');
  }

  const numericIds = ids as number[];
  res.json({
    ids: numericIds,
    tokens: numericIds.map(tokenizer.pieceOf),
    text: tokenizer.decode(numericIds),
    note: "Decode the WHOLE buffer, never one token at a time: a token boundary is not a word boundary (§02.7).",
  });
});
