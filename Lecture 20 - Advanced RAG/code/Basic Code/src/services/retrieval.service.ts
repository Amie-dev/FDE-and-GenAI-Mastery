/**
 * Chapter 03 — Retrieval Controls (Top-K, Threshold, Filters)
 *
 * Bounded retrieval request: how many candidates (K), how weak a match
 * may be (threshold), and which documents are eligible (filter).
 */

export interface RetrievalRequest {
  query: string;
  topK?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
  namespace?: string;
}

export interface Candidate {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

/**
 * In-memory vector store substitute for this basic implementation.
 * In production, replace with Qdrant / Pinecone / Weaviate etc.
 */
const DOCUMENTS: Candidate[] = [
  {
    id: "doc-1",
    text: "General Return Policy: Eligible products may be returned within 30 days of delivery.",
    score: 0,
    metadata: { category: "general", section: "returns", effectiveFrom: "2024-01-01" },
  },
  {
    id: "doc-2",
    text: "Electronics Return Policy: Electronic products may be returned within 7 days of delivery, subject to inspection.",
    score: 0,
    metadata: { category: "electronics", section: "returns", effectiveFrom: "2024-01-01" },
  },
  {
    id: "doc-3",
    text: "Damaged Product Policy: Customers must report a damaged product within 48 hours of delivery.",
    score: 0,
    metadata: { category: "electronics", section: "damaged", effectiveFrom: "2024-01-01" },
  },
  {
    id: "doc-4",
    text: "Exchange Policy: Eligible products can be exchanged within 7 days.",
    score: 0,
    metadata: { category: "general", section: "exchange", effectiveFrom: "2024-01-01" },
  },
];

/**
 * Fake cosine similarity so the example runs without an embedding API.
 * Higher = more similar.
 */
function similarity(query: string, text: string): number {
  const qWords = query.toLowerCase().split(/\s+/);
  const tWords = text.toLowerCase().split(/\s+/);
  const overlap = qWords.filter((w) => tWords.includes(w)).length;
  return overlap / Math.max(qWords.length, 1);
}

/**
 * Retrieve candidates bounded by topK, threshold, and filter.
 * Logs the filter trace for observability (Chapter 03 §3.11).
 */
export function retrieve(req: RetrievalRequest): {
  candidates: Candidate[];
  trace: { filter: Record<string, unknown> | undefined; returned: number; underK: boolean };
} {
  let results = DOCUMENTS.map((d) => ({
    ...d,
    score: similarity(req.query, d.text),
  }));

  // Apply metadata filter (Chapter 03: filter decides which documents are eligible)
  if (req.filter) {
    results = results.filter((c) => {
      return Object.entries(req.filter!).every(([k, v]) => c.metadata[k] === v);
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Apply threshold (Chapter 03: reject weak matches)
  const threshold = req.threshold ?? 0;
  results = results.filter((c) => c.score >= threshold);

  // Apply topK (Chapter 03: bound how many reach the prompt)
  const topK = req.topK ?? 20;
  const underK = results.length < topK;
  results = results.slice(0, topK);

  return {
    candidates: results,
    trace: {
      filter: req.filter,
      returned: results.length,
      underK,
    },
  };
}