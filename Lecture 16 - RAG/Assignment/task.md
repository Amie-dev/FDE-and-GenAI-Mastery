# Lecture 16 — RAG: Assignment & Practice Questions

> Complete these after reading the notes in `notes/` and reviewing the code in `code/Basic Code/`.
> Each task maps to a chapter. Use the code as a reference implementation, then extend or verify it yourself.

---

## How to use

1. Read the chapter in `notes/0X_<topic>.md`.
2. Read the matching source file in `code/Basic Code/src/` (see the implementations guide for block-by-block explanations).
3. Attempt the task below for that chapter.
4. Check your work against the completion gate at the end.

---

## Chapter 01 — RAG Fundamentals: The Stateless Model

**Task 1.1 — Parametric vs non-parametric memory (written answer)**
In your own words, explain the difference between parametric memory (model weights) and non-parametric memory (external documents). Give one example of a question each type can answer well, and one it cannot.

**Task 1.2 — Why RAG exists (written answer)**
A support bot launched last year is asked about a refund policy changed last week. Explain why the LLM cannot know this from its weights, and why retrieval fixes it. What is the one thing RAG does *not* make the model better at?

**Related code:** `src/types.ts`, `src/config/config.ts`


## Chapter 02 — Open-Book Architecture: Two Pipelines

**Task 2.1 — Draw the two pipelines (written + diagram)**
Draw or describe the ingestion pipeline (offline) and the serving pipeline (online). Label the trigger, frequency, and priority of each. Where do the two pipelines share state?

**Task 2.2 — Seven query steps (code trace)**
List the seven ordered steps of a query path. For each step, name the function or file in `code/Basic Code/src/` that implements it.

**Related code:** `src/router/index.ts`, `src/controllers/rag.controller.ts`

## Chapter 03 — Ingestion: Documents to Chunks

**Task 3.1 — Chunk with overlap (code)**
Write a function that splits a document into overlapping chunks of `size` characters with `overlap` characters of overlap. Verify that no text is lost at the boundaries (the end of one chunk overlaps into the start of the next).

**Task 3.2 — Content-addressed IDs (code)**
Implement a stable ID function: `stableId(source, chunkIndex, text)` that always returns the same ID for the same input. Show that re-ingesting the same document twice produces the same records, not duplicates. (Reference: `src/services/ingestion.ts`.)

**Task 3.3 — Metadata for citation (written)**
What flat metadata fields should every chunk carry so the system can cite sources and filter by tenant? Why should metadata never store the entire document?

**Related code:** `src/services/ingestion.ts`, `src/types.ts`

## Chapter 04 — Embeddings at Query Time

**Task 4.1 — One model, one dimension (code + written)**
Open `src/services/embedding.ts` and `src/config/config.ts`. Confirm that `embedText()` and ingestion use the same `embeddingModel` and `embeddingDims`. What would break if ingestion used 1536 dims and query used 1024 dims?

**Task 4.2 — Dimension guard (code)**
Add a runtime assertion that throws if the embedding vector length does not match `config.embeddingDims`. Test it by temporarily changing `EMBEDDING_DIMS` in `.env` and confirming the app fails loudly instead of silently storing wrong vectors.

**Related code:** `src/services/embedding.ts`, `src/config/config.ts`

## Chapter 05 — The Vector Index: Retrieval Engine

**Task 5.1 — Tenant-filtered retrieval (code)**
Write a retrieval function that takes a question + `tenantId`, embeds the question, queries the index, and returns only chunks whose `metadata.tenantId` matches. Prove cross-tenant isolation: ingest a document for tenant "acme", then query with tenant "other" — expect zero results. (Reference: `src/services/retrieval.ts`.)

**Task 5.2 — Score floor + top-K (code)**
Add a score floor (drop matches below a threshold) and cap results at `topK` (default 4). Show that over-fetching (e.g. `topK * 4`) followed by filtering still returns at most 4 chunks.

**Task 5.3 — Dedupe per document (code)**
Limit results to at most 2 chunks per source document. Show that five near-identical chunks from one document cannot dominate the context budget.

**Related code:** `src/services/retrieval.ts`, `src/services/ingestion.ts` (the `vectorIndex`)

## Chapter 06 — Grounded Generation: Prompt Contract

**Task 6.1 — Build a grounded prompt (code)**
Write `buildPrompt(question, chunks)` that assembles: system prompt (answer ONLY from context; refuse if missing), numbered context chunks with `[n]` labels and source info, and the question. Verify the model cannot cite a chunk it did not see. (Reference: `src/services/generation.ts`.)

**Task 6.2 — Refusal path (code)**
Add explicit refusal instructions. When no chunks are retrieved, the model must say "I don't have that information." Test with a question whose answer is not in any document.

**Task 6.3 — Citation verification (code)**
After generation, check that every `[n]` citation in the answer corresponds to a chunk actually placed in the prompt. Report which chunks were cited.

**Related code:** `src/services/generation.ts`, `src/controllers/rag.controller.ts`

## Chapter 07 — Conversation State and Memory

**Task 7.1 — Session memory (code)**
Implement a session store keyed by `sessionId` that holds `tenantId` and a message history. Append user + assistant turns after each query. Cap history at 20 messages so the prompt never overflows. (Reference: `src/services/memory.ts`.)

**Task 7.2 — Tenant isolation on sessions (code)**
Prove that a session created for tenant "acme" cannot be loaded with tenant "other". The `tenantId` must live on the session and be checked on every request.

**Task 7.3 — Why naive history fails (written)**
Explain why sending raw follow-up questions like "And for shoes?" to retrieval produces poor results. How does query rewriting fix this?

**Related code:** `src/services/memory.ts`, `src/controllers/rag.controller.ts`

## Chapter 08 — Evaluation and Debugging

**Task 8.1 — Build a mini goldenset (code)**
Create a JSONL file with 5 question → gold chunk id pairs. Write a script that calls `POST /api/query` for each question and reports Hit Rate @ 5 (did any gold chunk appear in `retrievedChunks`?).

**Task 8.2 — Refusal test row (code)**
Add a goldenset row where the answer is NOT in the corpus. Verify the response returns `refused: true` and empty `retrievedChunks`.

**Task 8.3 — Debug a wrong answer (written)**
Describe a stage-by-stage debug process: if the answer is wrong, how do you tell whether ingestion, retrieval, or generation failed? What evidence do you check at each stage?

**Related code:** `src/services/retrieval.ts`, `src/services/generation.ts`

## Chapter 09 — Production System Design

**Task 9.1 — Four layers (written)**
Name the four production layers (presentation, application, data, infrastructure). For each, name one file or component in `code/Basic Code/` that belongs to it.

**Task 9.2 — Cost control (code)**
Show how `topK`, `max_tokens`, and `temperature` keep generation cheap. What happens to cost if you raise `topK` from 4 to 100?

**Task 9.3 — Four escapes (written)**
What are the four escape questions every RAG system must answer? What is the system response for each? (No context → refuse; Wrong context → log + escalate; Model confused → regenerate; Overloaded → 429/503.)

**Related code:** `src/index.ts`, `src/config/config.ts`

---

## Completion Gate

You can move on to Lecture 17 when you can do all of the following:

- [ ] Ingest a document via `POST /api/ingest` and confirm chunks are created.
- [ ] Ask a grounded question via `POST /api/query` and get an answer with `[n]` citations.
- [ ] Ask a question with no matching document and get a refusal (`refused: true`).
- [ ] Prove tenant isolation: tenant "acme" cannot read tenant "other"'s documents.
- [ ] Re-ingest the same document twice and confirm no duplicate vectors.
- [ ] Build a mini goldenset (5 rows) and report Hit Rate @ 5.

> **Gate evidence:** keep a `scratch/` folder (or notes) with your curl outputs and goldenset results. The roadmap gate for Lecture 16 is: *given a wrong answer, you can attribute it to retrieval, generation, spec or pass — with evidence.*