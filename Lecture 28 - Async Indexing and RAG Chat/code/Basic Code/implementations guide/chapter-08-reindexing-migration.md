# Chapter 8: Re-indexing, Model Migration & Ingestion

Based on `notes/08_Re_indexing_Model_Migration_Ingestion.md`.

## 8.1 Files involved

- `src/services/source.service.ts` — `reprocessSource`
- `src/controllers/source.controller.ts` — `POST /api/sources/:id/reprocess`
- `src/store/memory-store.ts` — chunk deletion

## 8.2 Commands

```bash
curl -X POST http://localhost:4000/api/sources/<id>/reprocess
```

## 8.3 Full code — relevant part of src/services/source.service.ts

```ts
export async function reprocessSource(sourceId: string) {
  const source = store.getSource(sourceId);
  if (!source) throw new Error("Source not found");
  if (source.status === "PROCESSING") throw new Error("Already processing");
  // 1. Remove from vector index (cleanup old vectors before re-processing)
  store.deleteChunks(sourceId);
  // 2. Reset status to PENDING
  store.updateSource(sourceId, { status: "PENDING", metadata: { processingError: undefined, reprocessingAt: new Date().toISOString() } });
  // 3. Re-run the indexing pipeline
  await indexSource(sourceId);
  return store.getSource(sourceId);
}
```

## 8.4 Block-by-block explanation

| Block | What it does |
|-------|--------------|
| Guard checks | Source must exist and not already be processing. |
| `deleteChunks` | Cleans old vectors/chunks so re-indexing doesn't create duplicates (notes 8.7: clean up before re-processing). |
| Reset to `PENDING` | Clears `processingError` and stamps `reprocessingAt`, matching the state machine `READY → PROCESSING` / `FAILED → PENDING` transitions. |
| `indexSource` | Re-extracts, re-chunks, re-embeds, re-upserts — the full re-indexing pipeline. |

## 8.5 How it works

When an embedding model changes or a source fails partially, call reprocess. It wipes the old vectors, resets the state machine, and re-runs the indexing job. In production this also handles dimension changes via new Pinecone namespaces (model migration) and workspace-scoped quota checks (cost control).