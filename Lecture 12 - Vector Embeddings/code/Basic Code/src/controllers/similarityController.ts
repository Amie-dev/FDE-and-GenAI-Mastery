// controllers/similarityController.ts — compute the 4 similarity measures (Chapter 3)

import { Request, Response } from "express";
import { cosineSimilarity, euclideanDistance, manhattanDistance, dotProduct } from "../services/vectorEngine.js";
import { getSentences } from "../services/embeddings.js";

export const similarityController = {
  /** GET /api/similarity?a=&b= → four similarity measures */
  getSimilarity: (req: Request, res: Response) => {
    const { a, b } = req.query;
    if (!a || !b) {
      return res.status(400).json({
        success: false,
        error: "Missing query param: provide 'a' and 'b'",
      });
    }

    const sentences = getSentences();
    const sa = sentences.find((s) => s.text === a);
    const sb = sentences.find((s) => s.text === b);
    if (!sa || !sb) {
      return res.status(404).json({
        success: false,
        error: "One or both sentences not found in the corpus",
      });
    }

    const aEmb = sa.embedding;
    const bEmb = sb.embedding;

    res.json({
      success: true,
      a: sa.text,
      b: sb.text,
      measures: {
        cosine: cosineSimilarity(aEmb, bEmb),
        euclidean: euclideanDistance(aEmb, bEmb),
        manhattan: manhattanDistance(aEmb, bEmb),
        dotProduct: dotProduct(aEmb, bEmb),
      },
    });
  },
};
