import type { Request, Response } from "express";
import { asyncHandler, badRequest } from "../middleware/errorHandler";
import { requireText } from "../middleware/validate";
import * as embeddings from "../services/embeddingService";
import * as tokenizer from "../services/tokenizerService";

/** Chapter 06 - from ID to vector, and the three ways to measure "how close". */

const METRICS = ["cosine", "dot", "euclidean"] as const;
const round = (value: number): number => Number(value.toFixed(6));

/** POST /api/embeddings/lookup   { "text": "the cat" } */
export const lookup = asyncHandler((req: Request, res: Response) => {
  const text = requireText(req);
  const encoded = tokenizer.encode(text);
  const vectors = embeddings.embedAll(encoded.ids);

  res.json({
    text: tokenizer.normalize(text),
    tokens: encoded.tokens,
    ids: encoded.ids,
    dModel: embeddings.EMBEDDING_DIMS,
    vocabularySize: tokenizer.VOCAB_SIZE,
    rows: encoded.tokens.map((token, index) => ({
      token,
      id: encoded.ids[index],
      embedding: embeddings.preview(vectors[index], 6),
    })),
    textVector: embeddings.preview(embeddings.meanPool(encoded.ids), 6),
    note: "The lookup is a table read: W_emb[id]. No arithmetic is ever done on the id itself (§06.1).",
  });
});

/** POST /api/embeddings/similarity   { "textA": "...", "textB": "...", "metric": "cosine" } */
export const similarity = asyncHandler((req: Request, res: Response) => {
  const textA = requireText(req, "textA");
  const textB = requireText(req, "textB");
  const metric = ((req.body as { metric?: unknown }).metric ?? "cosine") as string;
  if (!METRICS.includes(metric as (typeof METRICS)[number])) {
    throw badRequest(`"metric" must be one of ${METRICS.join(" | ")}.`);
  }

  const vectorA = embeddings.meanPool(tokenizer.encode(textA).ids);
  const vectorB = embeddings.meanPool(tokenizer.encode(textB).ids);

  const cosine = embeddings.cosine(vectorA, vectorB);
  const normalisedDot = embeddings.dot(embeddings.normalize(vectorA), embeddings.normalize(vectorB));

  res.json({
    textA,
    textB,
    metric,
    dModel: embeddings.EMBEDDING_DIMS,
    vectorA: embeddings.preview(vectorA, 6),
    vectorB: embeddings.preview(vectorB, 6),
    cosine: round(cosine),
    dot: round(embeddings.dot(vectorA, vectorB)),
    euclidean: round(embeddings.euclidean(vectorA, vectorB)),
    normalisedDot: round(normalisedDot),
    normalisedDotEqualsCosine: Math.abs(cosine - normalisedDot) < 1e-9,
    note: "Once vectors are unit length, cosine similarity IS the dot product - which is why vector stores normalise on write (§06.4). These vectors come from a random table, so read the numbers as mechanics, not meaning (§06.6).",
  });
});
