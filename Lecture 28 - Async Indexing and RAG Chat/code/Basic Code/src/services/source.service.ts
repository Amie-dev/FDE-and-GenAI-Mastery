import { store } from "../store/memory-store";
import { Source, SourceStatus } from "../types";
import { indexSource } from "./indexing.service";

const VALID_TRANSITIONS: Record<SourceStatus, SourceStatus[]> = {
  PENDING: ["PROCESSING", "FAILED"],
  PROCESSING: ["READY", "FAILED"],
  READY: ["PROCESSING"],
  FAILED: ["PROCESSING", "PENDING"],
};

export function validateTransition(current: SourceStatus, next: SourceStatus): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

export function markProcessing(sourceId: string) {
  return store.updateSource(sourceId, { status: "PROCESSING" });
}

export function markReady(sourceId: string, chunkCount: number) {
  return store.updateSource(sourceId, { status: "READY", chunkCount, metadata: { indexedAt: new Date().toISOString() } });
}

export function markFailed(sourceId: string, error: string) {
  return store.updateSource(sourceId, { status: "FAILED", metadata: { processingError: error } });
}

export async function reprocessSource(sourceId: string) {
  const source = store.getSource(sourceId);
  if (!source) throw new Error("Source not found");
  if (source.status === "PROCESSING") throw new Error("Already processing");
  // Chapter 2 & 8: cleanup old vectors then reset to PENDING and re-index
  store.deleteChunks(sourceId);
  store.updateSource(sourceId, { status: "PENDING", metadata: { processingError: undefined, reprocessingAt: new Date().toISOString() } });
  await indexSource(sourceId);
  return store.getSource(sourceId);
}

export async function deleteSourceWithCleanup(sourceId: string) {
  store.deleteChunks(sourceId); // Chapter 2: remove chunks/vectors too
  return store.deleteSource(sourceId);
}