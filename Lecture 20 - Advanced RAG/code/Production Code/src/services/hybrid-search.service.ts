import { Candidate, HybridRequest } from "../types/index";
import { config } from "../config/config";
import { retrieve } from "./retrieval.service";

const DOCUMENTS: Candidate[] = [
  {
    id: "doc-1",
    text: "General Return Policy: Eligible products may be returned within 30 days of delivery.",
    score: 0,
    tokens: 12,
    start: 0,
    end: 12,
    source: "policy-general",
    metadata: { category: "general", section: "returns", effectiveFrom: "2024-01-01" },
  },
  {
    id: "doc-2",
    text: "Electronics Return Policy: Electronic products may be returned within 7 days of delivery, subject to inspection.",
    score: 0,
    tokens: 16,
    start: 0,
    end: 16,
    source: "policy-electronics",
    metadata: { category: "electronics", section: "returns", effectiveFrom: "2024-01-01" },
  },
  {
    id: "doc-3",
    text: "Damaged Product Policy: Customers must report a damaged product within 48 hours of delivery.",
    score: 0,
    tokens: 12,
    start: 0,
    end: 12,
    source: "policy-damaged",
    metadata: { category: "electronics", section: "damaged", effectiveFrom: "2024-01-01" },
  },
  {
    id: "doc-4",
    text: "Exchange Policy: Eligible products can be exchanged within 7 days.",
    score: 0,
    tokens: 10,
    start: 0,
    end: 10,
    source: "policy-exchange",
    metadata: { category: "general", section: "exchange", effectiveFrom: "2024-01-01" },
  },
];

function bm25Scores(query: string, docs: Candidate[]): number[] {
  const qTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const N = docs.length;
  const scores = new Array(docs.length).fill(0);

  qTerms.forEach((term) => {
    const n = docs.filter((d) => d.text.toLowerCase().includes(term)).length;
    const idf = Math.log((N - n + 0.5) / (n + 0.5) + 1);
    docs.forEach((d, i) => {
      const tf = (d.text.toLowerCase().match(new RegExp(term, "g")) || []).length;
      scores[i] += idf * (tf / (tf + 1));
    });
  });

  return scores;
}

function rrf(rankedLists: Candidate[][], k: number): Candidate[] {
  const scoreMap = new Map<string, { rrf: number; doc: Candidate }>();

  rankedLists.forEach((list) => {
    list.forEach((doc, rank) => {
      const existing = scoreMap.get(doc.id) || { rrf: 0, doc };
      existing.rrf += 1 / (k + rank + 1);
      scoreMap.set(doc.id, existing);
    });
  });

  return Array.from(scoreMap.values())
    .sort((a, b) => b.rrf - a.rrf)
    .map((entry) => ({ ...entry.doc, score: entry.rrf }));
}

function denseScore(query: string, text: string): number {
  const qWords = query.toLowerCase().split(/\s+/);
  const tWords = text.toLowerCase().split(/\s+/);
  const overlap = qWords.filter((w) => tWords.includes(w)).length;
  return overlap / Math.max(qWords.length, 1);
}

export function hybridSearch(req: HybridRequest): {
  candidates: Candidate[];
  dense: Candidate[];
  lexical: Candidate[];
} {
  const topK = req.topK ?? config.RETRIEVAL_TOP_K;
  const rrfK = config.RRF_K;

  const dense = [...DOCUMENTS]
    .map((d) => ({ ...d, score: denseScore(req.query, d.text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const bm25 = bm25Scores(req.query, DOCUMENTS);
  const lexical = DOCUMENTS
    .map((d, i) => ({ ...d, score: bm25[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const filter = req.filter ?? {};
  const keep = (c: Candidate) =>
    Object.entries(filter).every(([k, v]) => c.metadata[k] === v);

  const denseFiltered = dense.filter(keep);
  const lexicalFiltered = lexical.filter(keep);

  const fused = rrf([denseFiltered, lexicalFiltered], rrfK);
  return { candidates: fused, dense: denseFiltered, lexical: lexicalFiltered };
}