# Chapter 02 — IVF — Inverted File Index

This chapter explains **IVF (Inverted File Index)** from Chapter 02 of the notes. IVF is an ANN indexing strategy that partitions vector space into regions (centroids) and only searches the nearest regions at query time.

## 02.1 What IVF Does (from the Notes)

| Concept | Meaning |
|---------|---------|
| Partitioning | Split space into `nlist` regions using k-means centroids |
| Centroid | The mean vector of a cluster — the "address" of a region |
| Inverted list | Centroid → list of vector IDs assigned to that region |
| `nprobe` | How many nearest centroid lists to probe at query time |
| Boundary problem | A true neighbour might sit in a different region than the query |

IVF replaces "compare with every vector" with "compare with centroids, then compare with a few lists."

## 02.2 Relationship to the Basic Code

The basic code in `src/services/vectorService.ts` uses **brute-force linear scan** (Layer 4 = exact KNN). That is the baseline IVF improves upon.

IVF would add:
1. A training step (k-means) to build `nlist` centroids
2. Assignment of each vector to its nearest centroid's inverted list
3. At query time: compute distance to all centroids, pick the top `nprobe`, scan only those lists

This is an **optimization layer** on top of the basic service — it changes *how* candidates are found, not the record model or the similarity function.

## 02.3 Code File Reference

No new file is created in the basic code for IVF. The basic implementation demonstrates the **read path** (filter → similarity → sort → top-k) that IVF wraps around.

If you wanted to add IVF to the basic code, you would:
1. Add a `train(vectors)` method that runs k-means and stores centroids
2. Add an `assign()` step that maps each vector ID to a centroid list
3. Modify `search()` to probe only `nprobe` lists instead of scanning all vectors

The implementation guide for IVF is **conceptual** — the basic code already demonstrates the core search logic that IVF accelerates.

---

**Next:** [Chapter 03 — HNSW — Hierarchical Navigable Small World](./Chapter%2003%20-%20HNSW%20-%20Hierarchical%20Navigable%20Small%20World.md)