# Chapter 1: Async Indexing Pipeline

Based on `notes/01_Async_Indexing_Pipeline.md`.

## 1.1 Files involved

- `src/services/indexing.service.ts` — chunking + embed + index
- `src/store/memory-store.ts` — stores sources & chunks

## 1.2 Commands

Create a source (fires indexing in background):
```bash
curl -X POST http://localhost:4000/api/sources \
  -H 'Content-Type: application/json' \
  -d '{"workspaceId":"ws-1","title":"Notes","type":"TEXT","content":"..."}'
```

## 1.3 Full code — src/services/indexing.service.ts

```ts
import { store } from "../store/memory-store";
import { Source, Chunk } from "../types";

const MAX_CHUNK_SIZE = 500;
const OVERLAP = 50;

export function searchChunks(workspaceId: string, query: string, topK = 6): Chunk[] {
  return store.searchChunks(workspaceId, query, topK);
}

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

export async function embedAndIndex(source: Source, chunks: Chunk[]): Promise<void> {
  // Real: openai.embeddings.create(...) then pinecone.upsert(...)
  const indexed = chunks.map((c) => ({ ...c, embedding: [Math.random(), Math.random(), Math.random()] }));
  store.saveChunks(source.id, indexed);
  store.updateSource(source.id, { status: "READY", chunkCount: indexed.length, metadata: { indexedAt: new Date().toISOString() } });
}

export async function indexSource(sourceId: string): Promise<void> {
  const source = store.getSource(sourceId);
  if (!source) throw new Error("Source not found");
  store.updateSource(sourceId, { status: "PROCESSING" });
  const chunks = chunkText(source.content || "", sourceId);
  await embedAndIndex(source, chunks);
}
```

## 1.4 Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `MAX_CHUNK_SIZE` / `OVERLAP` | Config: chunk text into ~500 char pieces with 50 char overlap so context isn't lost at boundaries (sliding-window chunking from the notes). |
| `chunkText` | Splits text by paragraphs and greedily fills chunks up to `MAX_CHUNK_SIZE`, carrying over the last `OVERLAP` chars. Returns `Chunk[]` with index positions. |
| `embedAndIndex` | Stub for the real OpenAI embeddings → Pinecone upsert flow. Currently saves chunks with a random 3-dim vector and marks the source `READY` with `chunkCount`. |
| `indexSource` | Orchestrates the job: mark `PROCESSING`, chunk the text, embed + index. Called fire-and-forget from the source controller (durable job via Inngest in production). |

## 1.5 How it works

`POST /api/sources` creates a source with status `PENDING`, then calls `indexSource()` in the background. The source transitions `PENDING → PROCESSING → READY`. If you list the source shortly after creation, you'll see `status: "READY"` and `chunkCount` populated.