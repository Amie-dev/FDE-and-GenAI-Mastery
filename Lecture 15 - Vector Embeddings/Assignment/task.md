# Assignment — Lecture 12: Vector Embeddings

> **Phase:** 4 · **Level:** 🟢 Beginner
> **Source:** FDE L07

---

## 1. Task Statement

You have learned how a computer can represent *meaning* as a list of numbers (a vector),
and how similarity between vectors can be measured using four different mathematical formulas.
Your hands-on task is to **read the lecture notes and run the provided API code**, then
complete the tasks below. Each task is designed to make you understand, recall, and apply
the concepts from the lecture — not just memorise them.

The build target of this lecture is:

> **Meaning Explorer** — embed 30 sentences, print nearest neighbours, show paraphrases
> cluster while word-overlap does not.

You will work with the actual API you built in `code/Basic Code/`, which contains:
- `src/services/vectorEngine.ts` — the 4 similarity measures
- `src/services/embeddings.ts` — the sentence corpus
- `src/services/vectorArithmetic.ts` — king − man + woman ≈ queen
- `src/controllers/` / `src/routes/` / `src/index.ts` — the Express server
- `implementations guide/` — chapter-wise explanations

---

## 2. Deliverable Checklist

Complete **all** of the following tasks and write your answers in a single file
(e.g. `Assignment/answers.ipynb` or `Assignment/answers.md`). If you write code,
include it in the same file or in a companion file.

| Task | Type | Focus | Source |
|------|------|-------|--------|
| **A1** | Recall | Identity matching vs semantic similarity | Notes Ch 1 |
| **A2** | Recall | The four similarity measures and when to use each | Notes Ch 3 |
| **A3** | Understand | Why cosine is the recommended metric for embeddings | Notes Ch 3 |
| **A4** | Understand | What an embedding is (vs a raw vector) | Notes Ch 4–5 |
| **A5** | Apply | Compute all 4 similarity measures by hand for a 2-D vector pair | Code + Notes Ch 3 |
| **A6** | Apply | Find the `top-N` nearest neighbours of a query sentence using the API | Code `src/services/vectorEngine.ts` |
| **A7** | Apply | Explain why paraphrases cluster and unrelated sentences do not | Code `src/services/embeddings.ts` |
| **A8** | Apply | Demonstrate vector arithmetic: king − man + woman ≈ queen | Code `src/services/vectorArithmetic.ts` |
| **A9** | Analyze | Run the API, collect data, and report your findings | API endpoints |
| **A10** | Critique | Which similarity measure is best for embeddings, and why? | Notes Ch 3 |

---

## 3. Acceptance Criteria (How to Prove It Works)

For each task, indicate your answer and, where relevant, show the evidence:

| Criterion | How to Prove It |
|-----------|-----------------|
| A1 | Write 2 sentences: one showing identity matching, one showing semantic similarity |
| A2 | Write a table with all 4 measures + when to use each |
| A3 | Explain **why** cosine ignores magnitude, with a one-line example |
| A4 | Write the definition of an embedding (from the notes) in your own words |
| A5 | Show hand-calculated `dot`, `euclidean`, `manhattan`, `cosine` for a 2-D pair |
| A6 | Run the API; paste the JSON output of `GET /api/neighbors?text=…&top=3` |
| A7 | Show a neighbour list that groups paraphrases together |
| A8 | Run `GET /api/vector-arithmetic`; show the result and nearest neighbour |
| A9 | Provide a small table of your API data collection (what you asked, what you got) |
| A10 | Give a reasoned answer with a counter-example for a wrong choice |

---

## 4. Self-Check Questions (20)

Answer these in writing. They cover all chapters of the lecture.

### Chapter 1: The Problem of Meaning
1. Why can't a computer understand the word "Batman"? What does it store instead?
2. What is the difference between **identity matching** and **semantic similarity**?
3. Why are token IDs (e.g. `cat → 1043`) just "phone numbers" and not measurements?

### Chapter 2: From Numbers to Vectors
4. What is a vector, in the context of this lecture?
5. Why does order matter in a vector like `[9, 1]` vs `[1, 9]`?
6. Name 3 real embedding dimension sizes and what models use them.

### Chapter 3: Measuring Similarity
7. Write the formula for Euclidean distance.
8. Write the formula for Manhattan distance.
9. Write the formula for dot product.
10. Write the formula for cosine similarity.
11. Which measure ignores magnitude? Which one captures both direction and magnitude?
12. Which measure is best for text embeddings, and why?

### Chapter 4: The Failure of Hand-Crafted Features
13. What are three reasons hand-crafted features don't scale?
14. What's the difference between a **feature vector** (hand-made) and an **embedding** (learned)?
15. Why is a one-hot vector considered to have "no semantics"?

### Chapter 5: What Are Embeddings?
16. What does J.R. Firth's "company it keeps" principle mean?
17. What does `king − man + woman ≈ queen` demonstrate about embeddings?
18. What is a "latent" feature?

### Chapter 6: Applications & Real-World Use Cases
19. Name 3 real-world applications of embeddings (from the notes).
20. Why is the RAG pattern (retrieval-augmented generation) built on embeddings?

---

## 5. Stretch Goals (Optional – If You Finish Early)

1. **Increase vector dimension:** Change `DEFAULT_VECTOR_DIM` in `.env` to 32 or 64
   and observe how similarity scores change. Why might higher dimensions capture more nuance?
2. **Write your own corpus:** Add 5 sentences of your own to `embeddings.ts`. Group 2 as
   paraphrases and 3 as unrelated. Run the API and verify the neighbour output.
3. **Add a metric selector:** Modify the `/similarity` endpoint so the client can choose
   which measure to use (`?a=&b=&metric=cosine`). This is useful for the RAG pattern
   where "cosine (or normalize then use dot)" is the rule of thumb.
4. **Normalise vectors:** Use `normalize()` from `vectorEngine.ts`, then recompute cosine
   and dot product for the same pair. Show that they become identical after normalisation.

---

## 6. References & Submission

- **Notes:** `FDE-and-GenAI-Mastery/Lecture 12 - Vector Embeddings/Lecture_12_Complete_Notes.md`
- **Code:** `FDE-and-GenAI-Mastery/Lecture 12 - Vector Embeddings/code/Basic Code/`
- **Implementation Guide:** `FDE-and-GenAI-Mastery/Lecture 12 - Vector Embeddings/code/Basic Code/implementations guide/`

Submit your answers with evidence (output copies, hand calculations, or code snippets).
