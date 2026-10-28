# Chapter 03 — HNSW — Hierarchical Navigable Small World

This chapter explains **HNSW (Hierarchical Navigable Small World)** from Chapter 03 of the notes. HNSW is a graph-based ANN index where vectors are nodes and edges connect nearby vectors. Search becomes navigation through the graph.

## 03.1 What HNSW Does (from the Notes)

| Concept | Meaning |
|---------|---------|
| Proximity graph | Nearby vectors connected by edges |
| Greedy descent | Move to the closest neighbour at each step |
| Hierarchy | Sparse upper layers (long jumps) + dense base layer (local precision) |
| Level sampling | Exponential decay — few nodes reach top layers |
| `M` | Max neighbours per node (connectivity vs memory) |
| `efConstruction` | Build candidate budget (graph quality) |
| `efSearch` | Query candidate budget (recall/latency dial) |
| Tombstones | Deleted nodes left in graph until compaction |

## 03.2 Relationship to the Basic Code

The basic code uses brute-force linear scan. HNSW replaces the scan with **graph navigation**:

1. Start at an entry point (usually a node in the top layer)
2. Compare the query to the current node's neighbours
3. Move to the closest neighbour
4. Repeat until no neighbour is closer
5. Drop down a layer and repeat until layer 0

This avoids comparing the query to every vector — only to neighbours along the navigation path.

## 03.3 Code File Reference

No new file is created in the basic code for HNSW. The basic service's `search()` method demonstrates the **similarity computation + ranking** that HNSW uses at each navigation step, but HNSW adds the graph structure on top.

To add HNSW to the basic code you would:
1. Define a graph node structure (vector ID + neighbour IDs per layer)
2. Implement insertion with exponential level sampling
3. Implement greedy best-first search across layers
4. Replace `VectorService.search()` with graph navigation

The implementation guide for HNSW is **conceptual** — the basic code establishes the vector/similarity foundation that HNSW builds upon.

---

**Next:** [Chapter 04 — Product Quantization & Vector Compression](./Chapter%2004%20-%20Product%20Quantization%20&%20Vector%20Compression.md)