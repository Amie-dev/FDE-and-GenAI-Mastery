// controllers/neighborController.ts — nearest-neighbour search (Chapter 5 build target)

import { Request, Response } from "express";
import { findNearestNeighbors, cosineSimilarity } from "../services/vectorEngine.js";
import { getSentences } from "../services/embeddings.js";

export const neighborController = {
  /** GET /api/neighbors?text=&top=3 */
  getNeighbors: (req: Request, res: Response) => {
    const { text, top = "3" } = req.query;
    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Missing query param: 'text' is required",
      });
    }

    const topN = Math.min(Number(top), 10);
    const sentences = getSentences();

    try {
      const neighbours = findNearestNeighbors(
        sentences,
        String(text),
        topN,
        cosineSimilarity
      );
      res.json({ success: true, query: String(text), topN, neighbours });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  },
};
