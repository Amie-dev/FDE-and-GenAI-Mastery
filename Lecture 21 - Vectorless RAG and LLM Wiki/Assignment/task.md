# Lecture 18 — Vectorless RAG & LLM Wiki: Assignment & Practice Questions

> Complete these after reading the notes in `notes/` and reviewing the code in `code/Basic Code/`.
> Each task maps to a chapter. Use the code as a reference implementation, then extend or verify it yourself.

---

## How to use

1. Read the chapter in `notes/0X_<topic>.md`.
2. Read the matching source file in `code/Basic Code/src/` (see the implementations guide for block-by-block explanations).
3. Attempt the task below for that chapter.
4. Check your work against the completion gate at the end.

---

## Chapter 01 — Limitations of Vector RAG & the Abrupt Chunking Problem

**Task 1.1 — Abrupt chunking failure (written answer)**
Describe one real-world scenario where fixed-size token chunking splits a logical unit (e.g. a table, a clause, or a sentence with a pronoun like "it") and causes the retrieved chunk to lose its meaning. How does preserving document structure avoid this?

**Task 1.2 — Similarity ≠ relevance (written answer)**
Give an example of a query where a chunk is semantically similar (high cosine score) but not relevant to the question. Explain why vector similarity alone cannot guarantee contextual relevance.

**Related code:** `notes/01_limitations_vector_rag_chunking.md` (conceptual — no code file)

---

## Chapter 02 — Vectorless RAG & Tree-Structured Indexing

**Task 2.1 — Build the tree node (code)**
In `src/services/treeIndexingService.ts`, `buildTreeIndex()` creates `TreeNode` objects with `nodeId`, `title`, `level`, `pageRange`, `parentId`, `childrenIds`, `summary`, `keywords` and `sourceFile`. Write a small script that calls `buildTreeIndex('./demo-document.md')` and prints every node's `title`, `level`, and `pageRange`. Confirm parent/child links are preserved via `parentId` / `childrenIds`.

**Task 2.2 — O(1) lookup (code)**
Call `getNode(nodeId)` for a known node id and confirm it returns the correct node instantly. Then call `getLineagePath(nodeId)` and confirm it returns the full root-to-node path (e.g. `["Chapter 2", "Section 2.2"]`).

**Task 2.3 — Lazy loading (written)**
Why does Vectorless RAG load full content only after a node is identified, rather than loading all sections upfront? What token savings does this give for a 1,000-page document?

**Related code:** `src/services/treeIndexingService.ts`, `src/types/index.ts`

---

## Chapter 03 — Agentic Tree Search & LLM Relevance Retrieval

**Task 3.1 — Navigate the tree (code)**
Call `POST /api/tree/search` with the query `"sticky sessions ALB failure"`. Confirm the response returns:
- `foundNode` pointing to the relevant section (e.g. Section 2.2)
- `navigationPath` showing the branch taken (root → chapter → section)
- `content` containing the lazy-loaded full content

**Task 3.2 — Pruning irrelevant branches (written)**
For the query above, which chapters does the agent prune without loading their content? How does this differ from Vector RAG scanning every chunk?

**Task 3.3 — Explainable path (written)**
Why is an explicit navigation path more explainable than a similarity score? Give an example of how you would cite the source using `navigationPath` / `pageRange`.

**Related code:** `src/services/agenticTreeSearchService.ts`, `src/controllers/treeController.ts`, `src/routes/index.ts`

---

## Chapter 04 — LLM Wiki Architecture (Andrej Karpathy)

**Task 4.1 — Ingest a document (code)**
Call `POST /api/wiki/ingest` with a `sourcePath` pointing to a real text/Markdown file. Confirm the response returns a `CatalogEntry` with `title`, `summary`, `tags`, and `filePath`. Check that a Markdown file with YAML frontmatter was written to the `vault/` folder.

**Task 4.2 — Catalog is metadata-only (written)**
Call `GET /api/wiki/catalog`. Confirm each entry contains only metadata (title, summary, tags, filePath) — never full content. Why is this important for scaling to thousands of documents?

**Task 4.3 — Human-readable knowledge (written)**
Open a generated `.md` file in `vault/`. Confirm you can read the title, tags, summary and content directly. How does this differ from a vector embedding stored in a vector database?

**Related code:** `src/services/wikiService.ts`, `src/controllers/wikiController.ts`

---

## Chapter 05 — Two-Pass Retrieval & Lazy Loading

**Task 5.1 — Pass 1 scan (code)**
Call `POST /api/wiki/search` with a query. Confirm `pass1Candidates` lists the documents whose titles/summaries/tags matched the query — without loading their full content.

**Task 5.2 — Pass 2 selective loading (code)**
Confirm `pass2Loaded` equals the number of candidates selected in Pass 1, and that only those documents' full content was loaded. Compare this to loading every document in the vault.

**Task 5.3 — Answer from context (written)**
Read the `answer` returned by the search. Confirm it is grounded only in the Pass 2 loaded documents. If no candidates matched, what should the answer say?

**Related code:** `src/services/twoPassRetrievalService.ts`, `src/services/wikiService.ts`, `src/controllers/wikiController.ts`

---

## Chapter 06 — System Comparison & Hybrid RAG

**Task 6.1 — Compare the three architectures (written)**
For each of Vector RAG, Vectorless RAG, and LLM Wiki, state:
- The index structure (flat vectors / tree / files + folders)
- The retrieval method (similarity / tree navigation / metadata scan)
- One use case where it is the best choice

**Task 6.2 — Cost vs accuracy (written)**
Where does Vectorless RAG sit on the cost/accuracy trade-off compared to Vector RAG and LLM Wiki? When is the extra LLM reasoning cost worth it?

**Task 6.3 — Hybrid RAG idea (written)**
Sketch a hybrid pipeline that uses Vector RAG for broad filtering (10,000 → 5 docs) then Vectorless RAG tree navigation within those 5 docs. Why does this combine the strengths of both?

**Related code:** `notes/06_system_comparison_hybrid_rag.md`, `notes/07_decision_framework_production_architecture.md` (conceptual)

---

## Chapter 07 — Decision Framework, Benchmarks & Production Architecture

**Task 7.1 — Choose the architecture (written)**
For each scenario below, pick Vector RAG, Vectorless RAG, LLM Wiki or Hybrid RAG, and justify:
- A 50-page FAQ with simple questions
- A 500-page legal contract where exact clause/page references matter
- A personal knowledge base of Markdown notes from many sources

**Task 7.2 — Production checklist (written)**
List the production requirements the notes mention: grounding check, validation, guardrails, explainability, token budget, latency. Which of these does your basic code implement, and which are missing?

**Task 7.3 — Explain your retrieval path (spoken / written)**
Without looking at notes, explain in 90 seconds: "How does Vectorless RAG find the answer to 'sticky sessions during ALB failure' without embeddings?" You should be able to draw the tree walk and name the code files involved.

**Related code:** `notes/07_decision_framework_production_architecture.md` (conceptual)

---

## Completion Gate

You can move on to Lecture 19 when you can do all of the following:

- [ ] Build the tree index via `POST /api/tree/build` and confirm nodes are created with parent/child links.
- [ ] Run agentic tree search via `POST /api/tree/search` and confirm it returns the right node + navigation path + lazy-loaded content.
- [ ] Ingest a document via `POST /api/wiki/ingest` and confirm a Markdown + YAML frontmatter file appears in `vault/`.
- [ ] List the catalog via `GET /api/wiki/catalog` and confirm only metadata is returned.
- [ ] Run two-pass retrieval via `POST /api/wiki/search` and confirm Pass 1 selects candidates and Pass 2 loads only those full documents.
- [ ] Explain the difference between Vector RAG, Vectorless RAG, and LLM Wiki without notes.

> **Gate evidence:** keep a `scratch/` folder (or notes) with your curl outputs. The roadmap gate for Lecture 18 is: *without notes, explain how Vectorless RAG finds an answer by walking the document tree — name the code files and the node fields involved.*
