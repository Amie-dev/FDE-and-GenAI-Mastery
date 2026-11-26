import { store } from "../store/memory-store";
import { Source, Chunk } from "../types";

// Chapter 1 & 3: keyword-overlap vector search stub (replace with Pinecone query)
export function searchChunks(workspaceId: string, query: string, topK = 6): Chunk[] {
  return store.searchChunks(workspaceId, query, topK);
}

const MAX_CHUNK_SIZE = 500;
const OVERLAP = 50;

// Chapter 1: sliding-window chunking (notes section 1.3)
export function chunkText(text: string, sourceId: string): Chunk[] {
  const paragraphs = text.split("\n\n");
  const chunks: Chunk[] = [];
  let current = "";
  let index = 0;

  for (const para of paragraphs) {
    if (current.length + para.length > MAX_CHUNK_SIZE) {
      if (current.length > 0) {
        chunks.push({ id: `chunk_${sourceId}_${index++}`, sourceId, index: chunks.length, content: current, createdAt: new Date() });
        current = current.slice(current.length - OVERLAP) + para;
      } else {
        current = para;
      }
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.length > 0) {
    chunks.push({ id: `chunk_${sourceId}_${index}`, sourceId, index: chunks.length, content: current, createdAt: new Date() });
  }
  return chunks;
}

// Chapter 1: OpenAI embeddings -> Pinecone upsert (stubbed so code runs without keys)
export async function embedAndIndex(source: Source, chunks: Chunk[]): Promise<void> {
  // Real implementation: openai.embeddings.create(...) then pinecone.upsert(...)
  const indexed = chunks.map((c) => ({ ...c, embedding: [Math.random(), Math.random(), Math.random()] }));
  store.saveChunks(source.id, indexed);
  store.updateSource(source.id, { status: "READY", chunkCount: indexed.length, metadata: { indexedAt: new Date().toISOString() } });
}

export async function indexSource(sourceId: string): Promise<void> {
  const source = store.getSource(sourceId);
  if (!source) throw new Error("Source not found");
  store.updateSource(sourceId, { status: "PROCESSING" });

  const text = source.content || "";
  const chunks = chunkText(text, sourceId);
  await embedAndIndex(source, chunks);
}