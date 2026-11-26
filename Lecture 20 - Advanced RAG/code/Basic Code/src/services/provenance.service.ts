/**
 * Chapter 09 — Chunk-Level Provenance Tracking & Calibrated Abstention
 *
 * Tracks source URI, page/line offsets, and SHA-256 content hashes for every
 * retrieved chunk, verifies inline [n] citations, and enforces a calibrated
 * abstention gate when retrieval confidence falls below threshold.
 */

import { createHash } from "node:crypto";
import type { Candidate } from "./retrieval.service";
import type { CRAGEvaluation } from "./crag.service";

export interface ChunkProvenance {
  chunkId: string;
  sourceUri: string;
  pageNumber: number;
  lineStart: number;
  lineEnd: number;
  contentHash: string;
}

export interface CitationVerificationResult {
  ok: boolean;
  citedIndices: number[];
  danglingCitations: number[];
  reason?: string;
}

export interface AbstentionDecision {
  abstained: boolean;
  topScore: number;
  threshold: number;
  reason: string;
  message?: string;
}

export const ABSTENTION_MESSAGE =
  "Insufficient evidence in the knowledge base to answer without fabrication.";

/** Compute SHA-256 content hash and build the 5-field provenance envelope. */
export function buildProvenance(candidate: Candidate): ChunkProvenance {
  const meta = candidate.metadata ?? {};
  const hash = createHash("sha256").update(candidate.text).digest("hex");

  return {
    chunkId: candidate.id,
    sourceUri: typeof meta.sourceUri === "string" ? meta.sourceUri : `kb://chunks/${candidate.id}`,
    pageNumber: typeof meta.pageNumber === "number" ? meta.pageNumber : 1,
    lineStart: typeof meta.lineStart === "number" ? meta.lineStart : 1,
    lineEnd: typeof meta.lineEnd === "number" ? meta.lineEnd : 1,
    contentHash: `sha256:${hash}`,
  };
}

/** Verify that every inline [n] citation marker in `answer` resolves to a provided chunk. */
export function verifyCitations(answer: string, candidates: Candidate[]): CitationVerificationResult {
  const matches = [...answer.matchAll(/\[(\d+)\]/g)];
  const citedIndices = [...new Set(matches.map((m) => Number(m[1])))];
  const danglingCitations = citedIndices.filter((idx) => idx < 1 || idx > candidates.length);

  if (citedIndices.length === 0) {
    return {
      ok: false,
      citedIndices,
      danglingCitations,
      reason: "Answer contains no inline [n] citations",
    };
  }

  if (danglingCitations.length > 0) {
    return {
      ok: false,
      citedIndices,
      danglingCitations,
      reason: `Dangling citation(s): ${danglingCitations.map((i) => `[${i}]`).join(", ")}`,
    };
  }

  return { ok: true, citedIndices, danglingCitations: [] };
}

/**
 * Calibrated abstention gate: refuse before/without fabrication whenever
 * retrieval confidence (`topScore`) is below `threshold` or CRAG flags insufficient evidence.
 */
export function checkAbstention(
  candidates: Candidate[],
  crag: CRAGEvaluation,
  threshold: number
): AbstentionDecision {
  const topScore = candidates.reduce((max, c) => Math.max(max, c.score), 0);

  if (candidates.length === 0) {
    return {
      abstained: true,
      topScore: 0,
      threshold,
      reason: "No retrieval candidates above floor",
      message: ABSTENTION_MESSAGE,
    };
  }

  if (topScore < threshold) {
    return {
      abstained: true,
      topScore,
      threshold,
      reason: `Top retrieval confidence (${topScore.toFixed(2)}) is below abstention threshold (${threshold.toFixed(2)})`,
      message: ABSTENTION_MESSAGE,
    };
  }

  if (!crag.sufficient) {
    return {
      abstained: true,
      topScore,
      threshold,
      reason: crag.reason,
      message: ABSTENTION_MESSAGE,
    };
  }

  return {
    abstained: false,
    topScore,
    threshold,
    reason: "Retrieval confidence and evidence coverage passed",
  };
}

