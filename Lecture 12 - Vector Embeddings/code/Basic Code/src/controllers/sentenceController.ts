// controllers/sentenceController.ts — thin route handlers (Chapter 5 corpus)

import { Request, Response } from "express";
import { getSentences } from "../services/embeddings.js";

export const sentenceController = {
  /** GET /api/sentences → return all embedded sentences */
  getAll: (_req: Request, res: Response) => {
    const sentences = getSentences();
    res.json({ success: true, count: sentences.length, sentences });
  },
};
