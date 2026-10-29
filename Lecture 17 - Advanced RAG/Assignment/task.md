# Assignment — Lecture 17: Advanced RAG

**Level:** 🟠 Advanced · 🟡 Intermediate
**Goal:** After reading the notes and building the code, complete these tasks to prove you understand why basic RAG breaks, and how each Advanced RAG control fixes it.

> **Reading contract:** Do not mark a task done until you can (a) explain the concept in one sentence, and (b) point to the code file + block that implements it.

---

## Part 1 — Core Concepts (1 per chapter)

### Chapter 00 — Setup & File Structure
1. **Trace the import chain.** From `index.ts` → `app.ts` → `routes/rag.route.ts` → `controllers/rag.controller.ts` → the service you wrote. Draw the boundaries: where does HTTP end and business logic begin? Why does this separation matter?
2. **KISS audit.** Look at every service. Which one could you delete and the system still works? Which one could you remove without deleting anything else? Explain what that tells you about the architecture.

### Chapter 01 — Basic RAG Foundation
3. **The seven-step query path.** List the seven decisions the system makes per request (validation → guardrail → rewrite → search → rerank → context → generation). Which step changes the answer the most? Which changes it the least?
4. **Express boundary.** What does `app.use(express.json())` do, and why is it before `app.use("/rag", ragRouter)`? What happens if you swap them?

### Chapter 02 — Chunking Strategies
5. **Token arithmetic.** A 3,000-token chunk with 50% overlap. How many chunks for a 10,000-token document? Write the formula and compute the number.
6. **Overlap debug.** If a sentence spans exactly the boundary between chunk N and chunk N+1 with 20% overlap, which chunk "owns" it? Why is this a citation problem?

### Chapter 03 — Retrieval Controls
7. **Score floor.** Why do we need a threshold at all, if top-K already bounds the count? Give a concrete example where top-K without a threshold is harmful.
8. **Filter trace.** If `filter: { category: "electronics" }` returns 3 results, what does `underK` tell you? What does it NOT tell you (and what should you log instead)?

### Chapter 04 — Hybrid Search & RRF
9. **Why RRF, not sum-of-scores?** Two retrievers return scores 0.9 and 0.1. Sum = 1.0. RRF uses positions. Explain why RRF is robust to score distributions that are not comparable.
10. **Same filter on both.** If the filter is `{ department: "sales" }`, and the dense retriever returns 20 results with 10 in sales, and the lexical retriever returns 20 results with 5 in sales — what happens to the fused result? Why is applying the filter to BOTH before RRF correct?

### Chapter 05 — Reranking
11. **Stage 1 vs Stage 2.** What does stage 1 (bi-encoder) optimize for? What does stage 2 (cross-encoder) optimize for? Why can't you do both in one pass?
12. **Graceful degradation.** If the reranker crashes, what does `degraded: true` mean? What happens to the user experience? How is this better than a 500 error?

### Chapter 06 — Query Processing
13. **Rewrite audit.** Given the query "How fix tdz in gemni node 429?", list every rewrite applied. Which rewrite changes the meaning? Which is just formatting?
14. **Intent routing.** If the query is "Give me last month's sales report", what source does it route to? Why is returning "sql" dangerous if you don't validate the SQL before executing it?

### Chapter 07 — Context Engineering
15. **Precedence rules.** Re-read the four precedence rules in `context-engineering.service.ts`. Which one is strongest? Which one is most likely to be violated in practice?
16. **Token budget.** If `maxTokens = 3000` and you have 10 candidates totaling 3,500 tokens, how many chunks do you get? What happens to the candidates you don't include? Is this better or worse than truncating the last chunk?

### Chapter 08 — Production Guardrails & CRAG
17. **Bidirectional PII.** Input: mask emails/phones before the query reaches the system. Output: scan the answer for leaked PII. What happens if the model is asked to "repeat the question back verbatim"? Trace it.
18. **CRAG bounded retry.** If `maxRetries = 2` and the first evaluation says "not sufficient", how many total fetches happen? Why cap at 2 and not 10?

---

## Part 2 — Code Tasks (hands-on)

### A. Chunking
19. **Write `chunkText` from scratch.** No looking at the code you wrote. Implement fixed-size chunking with overlap in 10 lines. Test with a 300-character string, `chunkSize = 100`, `overlap = 20`.
20. **Add parent-child chunking.** The notes discuss parent-child. Add a function that, given a child chunk, returns its parent document id + breadcrumb.

### B. Retrieval
21. **Implement `retrieve` with a real similarity.** Replace the mock cosine with actual cosine similarity. How does the threshold change as you tighten/loosen it?
22. **Add a namespace field.** The notes mention namespaces for isolation. Add a `namespace` string to `RetrievalRequest` and filter candidates by `metadata.namespace === namespace`.

### C. Hybrid + RRF
23. **Implement BM25 properly.** The current implementation is minimal. Fix it to handle terms with different IDF correctly. Add a `k1` and `b` parameter.
24. **Add score fusion variant.** Instead of pure RRF, also implement a "sum of normalized scores" variant. When does each work better? (Hint: think about when scores are comparable vs not.)

### D. Reranking
25. **Add cross-encoder timeout.** The notes mention graceful degradation. Add a simulated timeout so you can see `degraded: true` in action.
26. **Add recall@k metric.** After reranking, compute what fraction of the true relevant documents appear in the top-N. This measures reranker quality.

### E. Query Processing
27. **Add query expansion.** Given a query, generate 3 sub-queries by expanding synonyms. Use these as additional retrieve requests.
28. **Add a router for Postgres.** The notes mention PostgreSQL. Add a `source: "sql"` branch that returns a query hint, not raw SQL.

### F. Context Engineering
29. **Implement the "specific-first" ordering rule.** Write a generic function that takes a list of chunks with metadata and sorts them so that more specific categories come before general ones.
30. **Add citation verification.** Given a generated answer and the context chunks, verify that every `[n]` citation actually appears in chunk `n`.

### G. Guardrails + CRAG
31. **Add a jailbreak blocker.** Write an input guardrail that detects common jailbreak patterns ("ignore previous instructions", "you are now DAN", etc.) and blocks them.
32. **Add a "confidence score"** to the CRAG evaluation. Map `groundedness` and `completeness` to a 0-1 score. If below 0.5, always refuse (even if `sufficient = true`).

---

## Part 3 — Capstone: Build the complete pipeline
33. **Wire a real external service.** Pick one: embedding API (OpenAI), vector store (Qdrant), or LLM API. Replace the mock with a real call. Time it. Log the latency. How does it change the cost?

---

## Part 4 — Reflection (write one paragraph each)
34. **The main failure mode of basic RAG.** What is it, and which Advanced RAG control addresses it?
35. **The cost/quality trade-off.** Which Advanced RAG steps are cheap, and which are expensive? Where would you draw the line in production?
36. **What I would take to production.** If you were shipping Lecture 17 code tomorrow, what would you add, modify, or remove before it could handle real user traffic?

---

## Completion Gate
To complete this assignment, you must:
- [ ] Rewrite all code files so `npx tsc --noEmit` passes with zero errors
- [ ] Add at least 5 of the Part 2 tasks to the codebase (with tests or demonstration commands)
- [ ] Complete at least 3 of the Part 3/4 tasks
- [ ] Write a 300-word reflection in `notes/09_self_review.md` covering: (a) your biggest bug, (b) what you learned, (c) what to do next
- [ ] Submit a PR with the implementation guide updated + this task.md marked with checkmarks

> **Tip:** The roadmap.md → Appendix D lists exactly what to tick in `progress.md`.
