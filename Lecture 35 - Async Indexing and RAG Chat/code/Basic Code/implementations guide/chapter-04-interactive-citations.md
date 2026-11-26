# Chapter 4: Interactive Citations

Based on `notes/04_Interactive_Citations.md`.

## 4.1 Files involved

- `src/services/citation.service.ts` — citation build + chunk preview
- `src/controllers/citation.controller.ts` — `GET /api/sources/:sourceId/chunks/:chunkId`

## 4.2 Commands

```bash
curl http://localhost:4000/api/sources/<sourceId>/chunks/<chunkId>
```

## 4.3 Full code — src/services/citation.service.ts

```ts
import { store } from "../store/memory-store";

export function getSourceChunkPreview(sourceId: string, chunkId: string) {
  const chunks = store.getChunks(sourceId);
  const chunk = chunks.find((c) => c.id === chunkId);
  if (!chunk) throw new Error("Chunk not found");
  return { chunk };
}

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
```

## 4.4 Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `getSourceChunkPreview` | Preview API for hover/click: finds a chunk by id within a source and returns its full content. In production, first verify workspace ownership (authorization from notes 4.7.3). |
| `buildCitations` | Turns retrieved chunks into `ChatCitation[]` with `excerpt` (first 280 chars) and a `citationIndex` used for `[1]`, `[2]` markers in the chat response. |

## 4.5 How it works

Chat responses cite sources as `[1]`, `[2]`, etc. The client calls the preview API with `sourceId` + `chunkId` to fetch the exact chunk text for a preview modal, letting users verify where an answer came from.