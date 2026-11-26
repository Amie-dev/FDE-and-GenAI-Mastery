# Lecture 14 — Assignment: Vector Search and Storage

**Goal:** After reading the notes and building/reviewing the basic code, complete the tasks below. Each task maps to a chapter in `notes/` and to the code in `code/Basic Code/`. The completion gate is at the end.

---

## How to use this file

- Work through the tasks in order (A → B → C).
- Write your answers in your own words — do not copy-paste from the notes.
- For coding tasks, modify or extend `code/Basic Code/` and verify by running the server.
- Record any measured numbers (latency, recall, vector count) — they must come from a command you can re-run.

---

## Part A — Understanding (answer in writing)

### Task A1 — The scale wall (Chapter 01)
1. With 30 movie vectors, brute-force KNN runs instantly. Why does the same algorithm require 100 million similarity calculations at 100M vectors?
2. What is the cost per query in Big-O notation, and why does that make brute force "fine for a demo and fatal for a product"?

### Task A2 — Storage vs search (Chapter 02–03)
1. The notes say vector search contains **two distinct problems**: storage and search. State each in one sentence.
2. A vector record has three minimum pieces. What are they, and why is each needed?
3. Can a relational database store vectors? If yes, what is the real limitation (it is *not* that it cannot store them)?

### Task A3 — The embedding model vs the vector database (Chapter 03)
1. The embedding model "understands meaning." What does the vector database actually do?
2. Why must every record store `modelId` and `modelVersion` alongside the vector?
3. What happens if you compare a vector from `text-embedding-3-small` to one from `text-embedding-3-large`?

### Task A4 — Brute-force KNN (Chapter 04)
1. Write out the brute-force KNN algorithm in plain English (score → sort → slice).
2. What is `K`, and is it an algorithm decision or a product decision?
3. What is cosine similarity, and what is its range?
4. Why does brute force give 100% recall but not scale?

### Task A5 — Why scalar indexes fail (Chapter 05)
1. B-trees need **total order** to prune. Why do vectors not have a natural total order?
2. A k-d tree prunes beautifully in 2D but fails in 1536D. Why?

### Task A6 — The curse of dimensionality (Chapter 06)
1. What is distance concentration, and how does it destroy pruning margins?
2. As dimensions grow, do nearest and farthest vectors become more similar or more different?

### Task A7 — ANN indexes (Chapter 07)
1. Why does sub-linear search require approximation?
2. Name two ANN index families from the notes (e.g., IVF, HNSW, PQ, LSH).
3. What is recall@K, and how do you measure it against exact search?

### Task A8 — Production design (Chapter 08)
1. Name three capacity, freshness, or quality concerns for a production vector search system.
2. What is two-stage retrieval, and why is it the production pattern?

---

## Part B — Hands-on code (modify `code/Basic Code/`)

### Task B1 — Run the basic code
1. `npm install`, `npm run build`, `npm start`.
2. Store three vectors via `POST /vectors` (use `curl` or a browser).
3. Search via `GET /search?vector=0.1,0.2,0.3&k=2`.
4. Paste the JSON response here and confirm the top result has the highest cosine score.

### Task B2 — Verify 100% recall
Brute force is the ground truth. Write a tiny script (or use `curl`) that:
1. Stores 10 vectors with known embeddings.
2. Runs search with `k=10` (return all).
3. Confirms every stored vector comes back (recall = 100%).

### Task B3 — Change the similarity metric
1. The current code uses cosine similarity. Add a `metric` option (cosine or Euclidean L2) to `searchVectors`.
2. Query with `k=5` using both metrics and note whether the top result changes.

### Task B4 — Store and filter by metadata
1. Each record already supports `metadata`. Store two vectors with `genre: "Sci-Fi"` and two with `genre: "Action"`.
2. Search and confirm you can see the `metadata` in the results.
3. (Thinking only — no code required) How would you pre-filter to only `genre: "Sci-Fi"` before ranking? Where would that check live: before scoring, after scoring, or during scoring?

### Task B5 — Measure the brute-force cost
1. Generate N stored vectors (try N = 100, 1,000, 10,000) with D = 128 dimensions.
2. Time a single `GET /search` request for each N.
3. Record the latency and observe how it grows. Does it match O(N × D)?

### Task B6 — Upsert by ID
1. Store a vector with `id: "doc-1"`.
2. Store again with the same `id: "doc-1"` but a different embedding.
3. Confirm `vectorCount()` does not double — the second write overwrote the first (idempotent upsert).

---

## Part C — Extension (choose one or more)

### Task C1 — Add a health endpoint
Add `GET /health` that returns `{ status: "ok", stored: <count> }`. Wire it in `routes/index.ts` and `vectorController.ts`.

### Task C2 — Add input validation
Reject queries where the query vector dimension does not match the stored vectors' dimension. Return `400` with a clear message.

### Task C3 — Compare brute force vs ANN (preparation for Lecture 15)
1. Implement a very simple ANN: split stored vectors into `nlist` buckets by nearest centroid, search only the closest bucket, return top-K.
2. Measure recall@K against the brute-force baseline (Task B2) and latency against Task B5.
3. State your recall/latency budget and defend whether this ANN meets it.

---

## Completion gate

You can check this box only when you can answer **without notes**:

- [ ] I can state the brute-force KNN cost (O(N × D)) and why it fails at 100M vectors.
- [ ] I can explain why a B-tree cannot index vector similarity.
- [ ] I can run the basic code, store vectors, and return top-K via `GET /search`.
- [ ] I can state my recall/latency budget and name the index type I would choose to meet it.

Write the number you measured in Task B5 here: ______ ms for N = ______, D = ______.

Then tick Appendix D in `roadmap.md` (Notes written ✅ · Code built ✅ · Gate passed ☐ until Task C3 is done).
