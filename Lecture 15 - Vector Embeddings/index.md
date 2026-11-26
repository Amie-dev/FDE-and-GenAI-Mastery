# Lecture 12 - Vector Embeddings: Chapter Index

## Chapter Notes

| Chapter | Title | File | Topics Covered |
|---------|-------|------|----------------|
| 01 | The Problem of Meaning in Computers | `notes/01_the_problem_of_meaning_in_computers.md` | Symbols vs meaning, identity matching vs semantic similarity, token IDs, why math requires numbers, naive encoding traps, one-hot encoding |
| 02 | From Numbers to Vectors | `notes/02_from_numbers_to_vectors.md` | Building feature spaces (1D→2D→nD), vector order, dimensions, vector space concept, matrix representation |
| 03 | Measuring Similarity Between Vectors | `notes/03_measuring_similarity_between_vectors.md` | Euclidean (L2), Manhattan (L1), Dot Product, Cosine Similarity, when to use each, operational pairing with indexes |
| 04 | The Failure of Hand-Crafted Features | `notes/04_the_failure_of_hand_crafted_features.md` | Feature engineering limits, one-hot/BoW/TF-IDF, interpretability trap, embedding model vs generative LLM, identity vs semantic retrieval |
| 05 | What Are Embeddings? Learning Representations | `notes/05_what_are_embeddings_learning_representations.md` | Learned representations, "company it keeps", training objectives, embedding table, vector arithmetic (king-man+woman=queen), latent features, anomaly detection |
| 06 | Vector vs Embedding — Applications & Real-World Use Cases | `notes/06_vector_vs_embedding_and_applications.md` | Vector vs embedding distinction, what can be embedded, semantic search, recommendation, clustering, classification, RAG, multi-modal embeddings, practical considerations (normalization, quantization, dimensionality), cross-lingual embeddings, visualization |
| 07 | The Complete Journey — From Objects to Embeddings | `notes/07_the_complete_journey_synthesis.md` | Full progression synthesis, definitive definition, end-to-end RAG example, governing equations, cross-chapter comparison table, what comes next |

---

## Complete Notes

- **Lecture_12_Complete_Notes.md** — Synthesis of all 7 chapters into a single coherent reference

---

## Quick Reference: Core Concepts

| Concept | Chapter |
|---------|---------|
| Symbol vs Meaning | 1 |
| Identity Matching vs Semantic Similarity | 1 |
| Token IDs = Labels, Not Measurements | 1 |
| Vector as Ordered Feature List | 2 |
| Vector Space = Continuous Similarity | 2 |
| Euclidean Distance | 3 |
| Manhattan Distance | 3 |
| Dot Product | 3 |
| Cosine Similarity | 3 |
| Feature Engineering Failure | 4 |
| One-Hot, BoW, TF-IDF Limitations | 4 |
| Interpretability Trap | 4 |
| Embedding Model vs Generative LLM | 4, 5 |
| Learned Representations | 5 |
| "Company it keeps" Principle | 5 |
| Vector Arithmetic (king - man + woman ≈ queen) | 5 |
| Latent Features / Latent Space | 5 |
| Vector vs Embedding Distinction | 6 |
| RAG Architecture | 6 |
| Common Embedding Models & Dimensions | 6 |
| Geometry Encodes Semantics | 7 |
| Complete End-to-End Journey | 7 |

---

## Build Target

**Goal:** "Meaning Explorer" — embed 30 sentences, print nearest neighbours, show paraphrases cluster while word-overlap does not.

**Completion Gate:** You can explain cosine similarity geometrically and why it ignores magnitude.