import { Request, Response } from "express";
import { store } from "../store/memory-store";
import { z } from "zod";
import { indexSource } from "../services/indexing.service";
import { reprocessSource, deleteSourceWithCleanup } from "../services/source.service";

const sourceSchema = z.object({ workspaceId: z.string(), title: z.string(), type: z.enum(["TEXT", "MARKDOWN", "PDF", "WEBSITE", "YOUTUBE"]), content: z.string().optional() });

// Chapter 1 & 2: create source (PENDING) then run async indexing pipeline
export async function createSource(req: Request, res: Response) {
  const data = sourceSchema.parse(req.body);
  const source = store.createSource(data);
  // fire-and-forget async indexing job (Inngest in production)
  indexSource(source.id).catch((err) => console.error("indexing failed:", err));
  res.status(201).json(source);
}

export function getSource(req: Request, res: Response) {
  const source = store.getSource(req.params.id);
  if (!source) return res.status(404).json({ error: "Source not found" });
  res.json(source);
}

export function listSources(req: Request, res: Response) {
  res.json(store.listSources(req.query.workspaceId as string));
}

export async function reprocessSourceController(req: Request, res: Response) {
  const source = await reprocessSource(req.params.id);
  res.json(source);
}

export async function deleteSourceController(req: Request, res: Response) {
  const ok = deleteSourceWithCleanup(req.params.id);
  if (!ok) return res.status(404).json({ error: "Source not found" });
  res.json({ message: "Source deleted + chunks cleaned up" });
}

export function getChunksForSource(req: Request, res: Response) {
  // Chapter 2: chunk inspection API
  res.json({ chunks: store.getChunks(req.params.sourceId), count: store.getChunks(req.params.sourceId).length });
}