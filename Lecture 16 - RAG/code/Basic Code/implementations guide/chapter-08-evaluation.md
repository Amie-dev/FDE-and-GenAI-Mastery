# Chapter 08 — Evaluation and Debugging

**Notes source:** `Lecture 16 - RAG/notes/08_evaluation_debugging.md`

**Goal:** Understand how to measure whether this basic RAG code is actually correct. The basic code itself does not include a goldenset or CI pipeline — those are production additions. This chapter explains what to measure and how, using the existing endpoints.

---

## What to measure (no new code required)

| Metric | What it means | How to check with this code |
|--------|---------------|------------------------------|
| Hit Rate @ K | % of questions where the right chunk appears in top-K | Call `POST /api/query`, check if `retrievedChunks` contains the expected chunk id |
| Refusal accuracy | Does the model say "I don't have that information" when the answer isn't in the docs? | Ask a question with no matching document, check `refused === true` |
| Groundedness | Does the answer only cite chunks that were retrieved? | Check that `citations` are a subset of `retrievedChunks` ids |
| Tenant isolation | Can tenant A read tenant B's documents? | Ingest with `tenantId: "a"`, query with `tenantId: "b"`, expect empty results |

## Debugging: print the full prompt

The basic code does not log the rendered prompt to a file, but you can inspect what the model sees by temporarily adding a `console.log(prompt)` inside `buildPrompt` in `src/services/generation.ts`. That is the fastest way to debug "why did the model answer that way?"

## Debugging: stage-by-stage trace

To debug a wrong answer, check each stage independently:

1. **Ingestion**: `POST /api/ingest` returns `{ chunks, embedded }`. If chunks is 0, extraction failed.
2. **Retrieval**: `POST /api/query` returns `retrievedChunks` with scores. If empty, retrieval found nothing (check embedding model match, tenant filter, score floor).
3. **Generation**: `POST /api/query` returns `answer` and `refused`. If the answer is wrong but chunks were retrieved, the generation prompt or temperature is the issue.

## What this basic code does NOT include (production additions)

| Concept | Notes say | Basic code |
|---------|-----------|------------|
| Goldenset | 30–100 real Q→chunk rows, version-controlled | Not included |
| CI gate | Block PR on score drop | Not included |
| Baseline | `scores/baseline.json` | Not included |
| Production logging | Log every turn with chunk IDs | Not included (console.log only) |
| LLM-as-judge | Score answers 0/1/2 | Not included |

## Command

```bash
# Manual refusal test (answer NOT in docs):
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question":"How do I fly to the moon?","tenantId":"acme","sessionId":"s-debug","roles":[]}'
# Expect: "refused": true, empty retrievedChunks
```
