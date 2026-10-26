import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { optionalTokenizer, requireText } from "../middleware/validate";
import * as strategyService from "../services/strategyService";

/** Chapter 03 - one sentence, three tokenizers, three prices. */

/** POST /api/strategies/compare   { "text": "Automatically, I love programming!", "model"?: "gpt-4o" } */
export const compare = asyncHandler((req: Request, res: Response) => {
  const text = requireText(req);
  res.json(strategyService.compare(text, optionalTokenizer(req)));
});
