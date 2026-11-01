# Chapter 2: Source Processing & State Machine

Based on `notes/02_Source_Processing_State_Machine.md`.

## 2.1 Files involved

- `src/services/source.service.ts` — state transitions + cleanup + reprocess
- `src/controllers/source.controller.ts` — source endpoints
- `src/store/memory-store.ts` — source/chunk persistence

## 2.2 Commands

```bash
# Get one source
curl http://localhost:4000/api/sources/<id>

# Re-process a source (cleanup → PENDING → re-index)
curl -X POST http://localhost:4000/api/sources/<id>/reprocess

# Delete source + its chunks
curl -X DELETE http://localhost:4000/api/sources/<id>

# Inspect chunks of a source
curl http://localhost:4000/api/sources/<sourceId>/chunks
```

## 2.3 Full code — src/services/source.service.ts

```ts
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
  store.deleteChunks(sourceId);
  store.updateSource(sourceId, { status: "PENDING", metadata: { processingError: undefined, reprocessingAt: new Date().toISOString() } });
  await indexSource(sourceId);
  return store.getSource(sourceId);
}

export async function deleteSourceWithCleanup(sourceId: string) {
  store.deleteChunks(sourceId);
  return store.deleteSource(sourceId);
}
```

## 2.4 Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `VALID_TRANSITIONS` | Defines the state machine: `PENDING → PROCESSING → READY/FAILED`, with `READY → PROCESSING` (reprocess) and `FAILED → PROCESSING/PENDING` (retry/reset). Matches the notes state diagram. |
| `validateTransition` | Returns `true` only if `next` is a legal move from `current`. Prevents invalid state changes. |
| `markProcessing` / `markReady` / `markFailed` | Small wrappers that update a source's status. `markReady` stores `chunkCount` and `indexedAt`; `markFailed` stores `processingError`. |
| `reprocessSource` | Deletes old chunks (Pinecone cleanup in production), resets status to `PENDING`, then runs `indexSource` again. Used when a model changes or a job failed. |
| `deleteSourceWithCleanup` | Removes both the source record and its chunks atomically — avoids orphaned vectors (the "incomplete cleanup" mistake from the notes). |

## 2.5 How it works

The controller creates sources as `PENDING`, and `indexSource` drives them to `READY`. Calling reprocess wipes chunks and restarts the pipeline, demonstrating re-processing capability from Chapter 2.