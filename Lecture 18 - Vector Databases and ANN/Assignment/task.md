# Lecture 15 Assignment — Vector Databases and ANN

> **Goal:** Prove you can build and operate a basic vector search API, explain the five layers, and reason about IVF / HNSW / PQ trade-offs — using only the code in `code/Basic Code/` and the notes in `notes/`.
>
> **Prerequisites:** Lecture 14 (Vector Search & Storage) — brute-force KNN, cosine similarity, O(N·D) baseline.
>
> **Estimated time:** 3–4 hours

---

## Deliverables (checklist)

| # | Deliverable | Done |
|---|-------------|------|
| 1 | Run the basic code: `npm install && npm run dev` in `code/Basic Code/` | ☐ |
| 2 | Store 5+ vectors with different payloads (tenant, category, etc.) via `POST /api/vectors` | ☐ |
| 3 | Query `POST /api/search` with and without a metadata filter; capture the JSON responses | ☐ |
| 4 | Explain, in your own words, how the five layers map to the files in `src/` | ☐ |
| 5 | Draw or describe how IVF would change `search()` compared to the current brute-force scan | ☐ |
| 6 | Compute cosine similarity by hand for two 3-dim vectors and verify against the API | ☐ |
| 7 | Answer all 6 practice questions below | ☐ |
| 8 | Pass the completion gate (see below) | ☐ |


## Practice Questions

### Q1 — Five Layers (Chapter 01)
A vector record has three parts: `id`, `vector`, and `payload`.

1. Which of the five layers does each part belong to?
2. Why is the vector database usually **not** the authoritative store for the original data (Layer 1)?
3. What symptom appears if Layer 5 (metadata / payload) is missing?

### Q2 — Cosine Similarity (Chapter 01, Layer 3)
Given two vectors:

```
A = [1, 0, 1]
B = [0, 1, 1]
```

1. Compute the dot product A·B.
2. Compute ||A|| and ||B||.
3. Compute cosine similarity(A, B).
4. Is the result closer to 1 or -1? What does that mean about semantic similarity?

### Q3 — Filtering (Chapter 01, Layer 5)
You store 100 vectors, 60 with `payload.tenant = "company-a"` and 40 with `payload.tenant = "company-b"`.

1. You call `POST /api/search` with `filter: { tenant: "company-b" }` and `k: 5`. How many vectors does `matchesFilter()` reject before scoring?
2. If you forgot to pass a filter, what would happen to the results? (Would company-a vectors appear?)

### Q4 — IVF vs Brute-Force (Chapter 02)
The basic code in `src/services/vectorService.ts` scans **every** vector on each search (O(N)).

1. What does IVF replace "compare with everything" with? (One sentence.)
2. If N = 1,000,000 and nlist = 1,000, how many centroid comparisons happen at query time before scanning any inverted list?
3. What is the "boundary problem" in IVF, and how does `nprobe` address it?

### Q5 — HNSW (Chapter 03)
1. What is the difference between a flat proximity graph and HNSW's hierarchical graph?
2. What do `M`, `efConstruction`, and `efSearch` each control? (One short phrase per parameter.)
3. Why does HNSW use more memory than IVF? (Hint: graph edges vs centroid lists.)

### Q6 — Product Quantization (Chapter 04)
1. A float32 vector of dimension 1,536 uses how many bytes?
2. With PQ using m = 24 subvectors and k = 256 centroids, how many bytes does one compressed vector use?
3. What is ADC, and why does it avoid decoding every vector at search time?

### Q7 — Engine Decisions (Chapter 05)
1. You are prototyping a RAG app with ~50,000 vectors and already run PostgreSQL. Which engine does Chapter 05 recommend, and why?
2. You need billion-scale search on a single machine. Which index combination does Chapter 05 recommend?
3. What is the main weakness of pgvector's filtering compared to Qdrant?


## Code Tasks

### Task A — Run and observe
```bash
cd "code/Basic Code"
npm install
npm run dev
```

Then in another terminal:

```bash
# Store three vectors with different tenants
curl -X POST http://localhost:3000/api/vectors \
  -H "Content-Type: application/json" \
  -d '{"id":"v1","vector":[0.9,0.1,0.0],"payload":{"tenant":"company-a","category":"docs"}}'

curl -X POST http://localhost:3000/api/vectors \
  -H "Content-Type: application/json" \
  -d '{"id":"v2","vector":[0.1,0.9,0.0],"payload":{"tenant":"company-b","category":"docs"}}'

curl -X POST http://localhost:3000/api/vectors \
  -H "Content-Type: application/json" \
  -d '{"id":"v3","vector":[0.8,0.2,0.0],"payload":{"tenant":"company-a","category":"tickets"}}'

# Search without filter
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"vector":[0.85,0.15,0.0],"k":5}'

# Search with filter
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"vector":[0.85,0.15,0.0],"k":5,"filter":{"tenant":"company-a"}}'

# Get count
curl http://localhost:3000/api/vectors/count
```

Capture the JSON output for the filtered and unfiltered searches. Note how the filter changes which vectors are returned.

### Task B — Map files to layers
Open each file in `src/` and write one sentence stating which of the five layers it implements:

| File | Layer(s) | One sentence |
|------|----------|--------------|
| `src/types/index.ts` | | |
| `src/config/config.ts` | | |
| `src/services/vectorService.ts` | | |
| `src/controllers/vectorController.ts` | | |
| `src/routes/index.ts` | | |
| `src/index.ts` | | |

### Task C — Sketch IVF on paper
Draw the IVF indexing flow for 12 vectors partitioned into 3 centroids:

1. Show k-means producing 3 centroids (C1, C2, C3).
2. Show each vector assigned to its nearest centroid's inverted list.
3. Show a query Q: compute distance to all 3 centroids, pick the top nprobe=2 lists, scan only those.
4. Label where the "boundary problem" could cause a true neighbour to be missed.


## Completion Gate

You can move on to Lecture 16 (RAG) when you can do all of the following **without looking at the notes**:

1. **Explain the five layers** and point to the file that implements each in `code/Basic Code/`.
2. **Run the API** and show a filtered search returning a different result set than an unfiltered search.
3. **Compute cosine similarity by hand** for two small vectors and explain what the score means.
4. **Explain IVF** in one paragraph: centroids → inverted lists → nprobe → boundary problem.
5. **Explain HNSW** in one paragraph: proximity graph → hierarchy → M / efConstruction / efSearch.
6. **Explain PQ** in one paragraph: subvectors → codebooks → codes → ADC → memory saving.
7. **Choose an engine** for a given scenario (prototype / growth / scale) using Chapter 05's decision table.

> **Gate evidence:** Save your `curl` responses, your hand-calculated cosine similarity, and your IVF/HNSW/PQ one-paragraph explanations in a file named `gate-evidence.md` inside this `Assignment/` folder. Show it to a reviewer (or self-certify).

## Stretch Goals (optional)

1. **Add a delete endpoint:** `DELETE /api/vectors/:id` that removes a vector from `VectorService.vectors` by id.
2. **Add IVF-lite:** Modify `search()` to split vectors into 3 pseudo-centroids (hard-coded) and only scan the nearest centroid's list. Measure how recall changes vs brute-force.
3. **Add PQ-lite:** Write a function that compresses each `number[]` vector to `Int8Array` (scalar quantization) and recomputes search on the decoded values. Compare memory vs float.
4. **Write a README for `code/Basic Code/`** that a new learner can follow to run the API from scratch in 5 minutes.

---

**Next lecture:** [Lecture 16 — RAG](../Lecture%2016%20-%20RAG/)
