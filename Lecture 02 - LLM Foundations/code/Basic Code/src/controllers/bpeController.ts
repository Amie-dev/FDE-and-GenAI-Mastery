import type { Request, Response } from "express";
import { asyncHandler, badRequest } from "../middleware/errorHandler";
import { optionalNumber, optionalStringArray, requireText } from "../middleware/validate";
import * as bpe from "../services/bpeService";
import * as tokenizer from "../services/tokenizerService";

/** Chapter 04 - BPE: train the merge list once, then encode with it forever. */

/** POST /api/bpe/train   { "corpus": ["low","low","lower"], "targetVocabSize": 40 } */
export const train = asyncHandler((req: Request, res: Response) => {
  const corpus = optionalStringArray(req, "corpus", bpe.NOTE_CORPUS);
  const targetVocabSize = optionalNumber(req, "targetVocabSize", 40, 5, 500);
  const model = bpe.trainBPE(corpus, targetVocabSize);

  res.json({
    corpus,
    targetVocabSize,
    merges: model.merges.map(([a, b]) => `${a} + ${b} -> ${a}${b}`),
    mergeCount: model.merges.length,
    vocabulary: model.vocab,
    vocabularySize: model.vocab.length,
    note: "Training is global and runs once. The ORDER of the merge list is the tokenizer - ship it with the weights (§04.10).",
  });
});

/** POST /api/bpe/encode   { "text": "lowest berry", "model": "note" | "trained" } */
export const encode = asyncHandler((req: Request, res: Response) => {
  const text = requireText(req);
  const which = (req.body as { model?: unknown }).model === "trained" ? "trained" : "note";
  const merges = which === "trained" ? bpe.DEMO_MODEL.merges : bpe.NOTE_MERGES;
  const { words, pieces } = bpe.encodeWithMerges(text, merges);

  res.json({
    text,
    model: which,
    mergeList: merges.map(([a, b]) => `${a} + ${b}`),
    words,
    pieces,
    tokenCount: pieces.length,
    decoded: bpe.decodePieces(pieces),
    note: 'The "</w>" marker is the end of a word, so merges never run across words. Encoding is greedy and local - it just replays the merge list (§04.10).',
  });
});

/** POST /api/bpe/count-letters   { "text": "strawberry", "letter": "r" } */
export const countLetters = asyncHandler((req: Request, res: Response) => {
  const text = requireText(req);
  const letter = requireText(req, "letter");
  const encoded = tokenizer.encode(text);
  const result = bpe.countLetters(text, letter);

  res.json({
    ...result,
    tokenizedAs: encoded.tokens,
    tokenCount: encoded.tokens.length,
    note: "The model never sees the letters - it sees these tokens. Anything that needs exact character work belongs in code, not in the model (§04.8).",
  });
});
