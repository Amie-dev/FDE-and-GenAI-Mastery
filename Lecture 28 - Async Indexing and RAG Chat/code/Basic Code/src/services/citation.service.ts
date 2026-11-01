import { store } from "../store/memory-store";

// Chapter 4: Interactive citations (notes 04)
// Preview API: fetch full chunk content for hover/click preview
export function getSourceChunkPreview(sourceId: string, chunkId: string) {
  const chunks = store.getChunks(sourceId);
  const chunk = chunks.find((c) => c.id === chunkId);
  if (!chunk) throw new Error("Chunk not found");
  return { chunk };
}

// Build citations from retrieved chunks (reused by chat service)
export function buildCitations(chunks: { id: string; sourceId: string; index: number; content: string }[]) {
  return chunks.map((c, i) => ({
    sourceId: c.sourceId,
    sourceTitle: `source_${c.sourceId.slice(0, 6)}`,
    sourceType: "TEXT",
    chunkId: c.id,
    chunkIndex: c.index,
    excerpt: c.content.slice(0, 280),
    citationIndex: i + 1,
  }));
}