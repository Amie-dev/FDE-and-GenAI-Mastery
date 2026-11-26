import { Request, Response } from "express";
import { getSourceChunkPreview } from "../services/citation.service";

// Chapter 4: Interactive citations preview API (notes 04)
export function previewChunk(req: Request, res: Response) {
  try {
    const preview = getSourceChunkPreview(req.params.sourceId, req.params.chunkId);
    res.json(preview);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}