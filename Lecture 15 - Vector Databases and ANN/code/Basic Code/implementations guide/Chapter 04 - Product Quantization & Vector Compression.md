# Chapter 04 — Product Quantization & Vector Compression

This chapter explains **Product Quantization (PQ)** from Chapter 04 of the notes. PQ compresses vectors by splitting them into subvectors and replacing each subvector with an index into a small codebook.

## 04.1 What PQ Does (from the Notes)

| Concept | Meaning |
|---------|---------|
| Scalar quantization | float32 → int8 per component (4× memory saving) |
| Product quantization | Split vector into subvectors, quantize each with a codebook (32–128× saving) |
| Codebook | Trained centroids per subvector |
| Encoding | Map subvector to nearest centroid index (m bytes per vector, k=256) |
| ADC | Query full precision, database compressed; table-lookup scoring without decoding |
| `m` | Subvectors per vector (more = better recall, larger codes) |
| `k` | Centroids per codebook (usually 256 = 1 byte per index) |
| IVF-PQ | Inverted lists + PQ codes (billion-scale single-machine search) |

## 04.2 Relationship to the Basic Code

The basic code stores vectors as `number[]` (float64 in JavaScript/TypeScript). PQ would replace that with compressed codes.

PQ would add:
1. A training step to build codebooks (k-means per subvector)
2. An encode step: convert each `number[]` vector into `m` codebook indices
3. ADC search: precompute distance tables from query to codebook centroids, score candidates via table lookup without decoding

This is a **memory optimization** — it changes *how* vectors are stored, not the API contract.

## 04.3 Code File Reference

No new file is created in the basic code for PQ. The basic service stores full-precision vectors and computes exact cosine similarity.

To add PQ to the basic code you would:
1. Add a `PQEncoder` class with `train(vectors, m, k)` and `encode(vector)` methods
2. Store `number[]` codes instead of full vectors in `VectorService`
3. Implement ADC: precompute distance tables, score codes during search

The implementation guide for PQ is **conceptual** — the basic code demonstrates the search interface that PQ compresses underneath.

---

**Next:** [Chapter 05 — Vector Database Engine Decisions & Production Operations](./Chapter%2005%20-%20Engine%20Decisions%20&%20Production%20Operations.md)