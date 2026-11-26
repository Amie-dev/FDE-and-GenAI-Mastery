# Lecture 28 — Async Indexing & RAG Chat: Assignment & Practice Questions

> Complete these after reading the notes in `notes/` and reviewing the code in `code/Basic Code/`.
> Each task maps to a chapter. Use the code as a reference implementation, then extend or verify it yourself.
> Source: `../roadmap.md` → "Lecture 28" → Build and Gate.

---

## How to use

1. Read the chapter in `notes/0X_<topic>.md`.
2. Read the matching source file in `code/Basic Code/src/` (see the implementations guide for block-by-block explanations).
3. Attempt the task below for that chapter.
4. Check your work against the completion gate at the end.

---

## 📋 Task Statement

Build and verify a minimal **async indexing + streaming RAG chat** system:

- Sources are created as `PENDING`, then indexed in the background (chunk → embed → vector store) and marked `READY` or `FAILED`.
- A source follows the state machine `PENDING → PROCESSING → READY/FAILED`, supports re-processing, and cleans up its chunks on delete.
- Chat is streamed over SSE: retrieve relevant chunks, build a numbered-citation system prompt, stream tokens, and save the assistant message with citations.
- Interactive citation preview returns the full chunk text for a given `sourceId` + `chunkId`.
- Job status is streamed over SSE with progress, failure and retry.

The core artefact is already built in `code/Basic Code/`. Your assignment is to verify it, extend it minimally, and answer the practice questions below.

---

## ✅ Deliverables Checklist

| # | Deliverable | Done |
|---|-------------|------|
| 1 | `.env` — `PORT`, provider keys (`OPENAI_API_KEY`, `PINECONE_API_KEY`, …) | ☐ |
| 2 | `package.json` + `package-lock.json` — express, cors, dotenv, zod, uuid, ts-node, typescript | ☐ |
| 3 | `tsconfig.json` — strict TypeScript, CommonJS output | ☐ |
| 4 | `src/config/config.ts` — env config loader | ☐ |
| 5 | `src/types/index.ts` — `Source`, `Chunk`, `Message`, `ChatCitation`, `Job`, `Artifact` types | ☐ |
| 6 | `src/store/memory-store.ts` — in-memory sources, chunks, conversations, jobs, artifacts | ☐ |
| 7 | `src/services/indexing.service.ts` — sliding-window chunking + embed/upsert stub + `searchChunks` | ☐ |
| 8 | `src/services/source.service.ts` — state machine validation, reprocess, delete-with-cleanup | ☐ |
| 9 | `src/controllers/source.controller.ts` — `POST/GET/DELETE /api/sources`, reprocess, chunks | ☐ |
| 10 | `src/services/chat.service.ts` — SSE streaming RAG chat with citations | ☐ |
| 11 | `src/controllers/chat.controller.ts` — `POST /api/chat` + conversation fetch | ☐ |
| 12 | `src/services/citation.service.ts` — citation build + chunk preview API | ☐ |
| 13 | `src/controllers/citation.controller.ts` — `GET /api/sources/:sourceId/chunks/:chunkId` | ☐ |
| 14 | `src/services/memory.service.ts` — Mem0 stub (add + search, user-scoped) | ☐ |
| 15 | `src/services/web-search.service.ts` — Tavily stub | ☐ |
| 16 | `src/services/artifact.service.ts` — flashcard/quiz/summary generation | ☐ |
| 17 | `src/services/job.service.ts` — job CRUD + status transitions + retry | ☐ |
| 18 | `src/controllers/job.controller.ts` — job endpoints + SSE status stream | ☐ |
| 19 | `src/routes/index.ts`, `src/app.ts`, `src/server.ts` — route mounting, error handling, listen | ☐ |
| 20 | `implementations guide/chapter-00…08.md` — per-chapter code walkthroughs | ☐ |
| 21 | `npm run typecheck` passes with no errors | ☐ |
| 22 | Server runs on `http://localhost:4000`; `GET /health` returns `{ ok: true }` | ☐ |


## 🎯 Practice Questions (chapter-wise)

### Chapter 01 — Async Indexing Pipeline

1. **Sliding-window chunking**: `src/services/indexing.service.ts` splits text by paragraphs and carries `OVERLAP` characters into the next chunk. Why does overlap matter for retrieval quality? What breaks if `OVERLAP` is `0`?
2. **Durable job**: The notes use Inngest for background indexing. In `code/Basic Code/`, `indexSource()` is called fire-and-forget from the controller. Which line starts it, and what would you replace it with to make it durable and retriable?
3. **Embedding stub**: `embedAndIndex()` currently stores a random 3-dim vector. If you swapped in OpenAI embeddings (1536 dims) and Pinecone upsert, which two files would change, and what config values must match between ingestion and query?

### Chapter 02 — Source Processing & State Machine

4. **State transitions**: `src/services/source.service.ts` defines `VALID_TRANSITIONS`. Is `READY → FAILED` allowed? Is `FAILED → PENDING` allowed? Why does the machine forbid `PROCESSING → PENDING`?
5. **Re-processing**: `reprocessSource()` deletes chunks, resets status to `PENDING`, then re-runs `indexSource`. Why must chunks be deleted *before* re-indexing instead of just overwriting?
6. **Delete cleanup**: `deleteSourceWithCleanup()` removes chunks and the source record. What would be left behind if you only deleted the source record? Relate this to the "incomplete cleanup" mistake in the notes.
7. **Chunk inspection**: Hit `GET /api/sources/:sourceId/chunks`. What does it return, and why is that endpoint useful for debugging retrieval quality?

### Chapter 03 — Streaming RAG Chat

8. **Retrieval**: `searchChunks()` uses keyword-overlap scoring over in-memory chunks. In production this becomes a Pinecone query. What changes in `src/services/indexing.service.ts` and `src/services/chat.service.ts`?
9. **System prompt**: `chat.service.ts` numbers context blocks `[1]`, `[2]`, … and tells the model to cite inline. Why does numbering matter for citation validation?
10. **SSE stream**: Which headers does the controller set, and what does each `data: …\n\n` frame carry? How does the client know the stream ended?
11. **Persistence**: After the stream finishes, the assistant message is saved with its `citations`. Why save citations with the message instead of recomputing them later?

### Chapter 04 — Interactive Citations

12. **Preview API**: `GET /api/sources/:sourceId/chunks/:chunkId` returns the full chunk text. How would the frontend use this for hover vs click previews?

### Chapter 05 — User Memory & Web Search

15. **User scoping**: `searchUserMemories(userId, …)` scopes Mem0 by `user_id`. Why is this a security requirement, not an optimization? What breaks if you omit it?
16. **Web citations**: When Tavily is enabled, results become `sourceType: "WEB"` citations with `citationId: "W1"`. How does the chat prompt distinguish web citations from workspace citations?
17. **Retention**: The notes mention purging memories older than 90 days. Why? What happens to context-window cost if you never prune?

### Chapter 06 — Learning Artifacts

18. **Artifact types**: `generateArtifacts()` creates one `FLASHCARD`, one `QUIZ`, one `SUMMARY` from assistant messages. What field differs between each type?
19. **Trigger timing**: The notes say artifacts are generated "at conversation end or periodic intervals". Where would you call `generateArtifacts()` in the chat flow?
20. **Validation**: The notes warn about hallucinated Q&A pairs. What validation step would you add before saving a flashcard?

### Chapter 07 — Job Status, Partial Failure & UX

21. **Job states**: `src/services/job.service.ts` allows `PENDING → RUNNING → COMPLETED/FAILED` and `FAILED → RETRYING → RUNNING`. Why can't a `COMPLETED` job be retried?
22. **SSE status stream**: `GET /api/jobs/:jobId/status` streams status updates. What does the client do when it receives `status: "COMPLETED"`?
23. **Progress**: `updateJobProgress(jobId, status, progress, message)` updates a job mid-run. Give an example message for the chunking step and one for the embedding step.
24. **Retry**: `retryJob()` rejects non-failed jobs and increments `retries`. How would you add exponential backoff before re-running?

### Chapter 08 — Re-indexing, Model Migration & Ingestion

25. **Re-index trigger**: List three events that should trigger re-indexing a source (from the notes flowchart).
26. **Dimension migration**: If you change embedding models, vector dimensions change (e.g., 1536 → 3072). Why can't you upsert new-dim vectors into the old Pinecone index/namespace? What does the notes' namespace isolation solve?
27. **Quota race**: `atomicQuotaIncrement()` in the notes uses a Prisma transaction. Why does a plain read-then-increment risk exceeding quota under concurrent requests?
28. **Cross-workspace security**: Every Pinecone/DB query must be scoped by `workspaceId`. Show one place in `source.controller.ts` where workspace scoping is already applied.

---

## 🎯 Acceptance Criteria

**The learner proves it works by:**

1. **Typecheck passes**
   ```bash
   cd "code/Basic Code"
   npx tsc --noEmit
   ```

2. **End-to-end source indexing**
   ```bash
   curl -s -X POST http://localhost:4000/api/sources \
     -H 'Content-Type: application/json' \
     -d '{"workspaceId":"ws-1","title":"Notes","type":"TEXT","content":"RAG stands for Retrieval Augmented Generation."}'
   # Then poll until status is READY and chunkCount > 0
   curl -s "http://localhost:4000/api/sources?workspaceId=ws-1"
   ```

3. **Streaming chat with citations**
   ```bash
   curl -N http://localhost:4000/api/chat?workspaceId=ws-1&userId=user-1 \
     -X POST -H 'Content-Type: application/json' \
     -d '{"message":"What is RAG?"}'
   # Expect SSE data frames, then done:true, plus X-Conversation-Id header
   ```

4. **Citation preview**
   ```bash
   curl -s "http://localhost:4000/api/sources/<sourceId>/chunks/<chunkId>"
   # Expect the full chunk content
   ```

5. **Job lifecycle**
   ```bash
   curl -s -X POST http://localhost:4000/api/jobs -H 'Content-Type: application/json' -d '{"type":"SourceJob"}'
   curl -s http://localhost:4000/api/jobs
   curl -s -X POST http://localhost:4000/api/jobs/<id>/fail -H 'Content-Type: application/json' -d '{"error":"boom"}'
   curl -s -X POST http://localhost:4000/api/jobs/<id>/retry
   ```

6. **Gate question** — answer without notes:
   > *"A source moves PENDING → PROCESSING → READY. Explain, using `src/services/source.service.ts` and `src/services/indexing.service.ts`, exactly where chunks are created, where the source is marked READY, and why re-processing must delete old chunks first."*

7. **Extended the system** (optional but recommended): Add one new feature following the same pattern — e.g. a `GET /api/stats` endpoint returning source count, chunk count and job counts from `store`. Register it in `src/routes/index.ts`, restart, and confirm it returns data.

---

## 📚 References

- **Notes:** `../notes/01_Async_Indexing_Pipeline.md` through `../notes/08_Re_indexing_Model_Migration_Ingestion.md`, plus `../Lecture_28_Complete_Notes.md`
- **Roadmap Build/Gate:** `../roadmap.md` → "Lecture 28"
- **Implementation guide:** `../code/Basic Code/implementations guide/chapter-00-file-structure.md` through `chapter-08-reindexing-migration.md`
- **Lecture README:** `../README.md` (objectives, phase, level, checklist)
13. **Authorization**: The notes require verifying workspace ownership before returning a chunk. Where would you add that check in `citation.service.ts` or `citation.controller.ts`?
14. **Citation shapes**: Contrast a workspace citation (has `chunkId`, `score`) with a web citation (has `url`, `citationId: "W1"`). When is each produced?