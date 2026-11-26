import { embedText } from "./embedding";
import { vectorIndex } from "./ingestion";
import { config } from "../config/config";
import type { Match, QueryContext } from "../types";

/**
 * Retrieval service — Chapters 04 and 05 (online path, first half).
 *
 * embed question -> ANN search + tenant filter -> score floor -> dedupe -> keep top-K.
 * Every query is filtered by tenant inside the index so one tenant can never read
 * another's documents (defence in depth).
 */

// Calibrated per corpus: only trust matches above this similarity.
const SCORE_FLOOR = 0.3;
// Never return more than 2 chunks from the same document (budget + diversity).
const MAX_PER_DOC = 2;

export async function retrieve(params: {
  question: string;
  ctx: QueryContext;
  topK?: number;
}): Promise<Match[]> {
  const { question, ctx, topK = config.topK } = params;

  // Same embedding function and space as ingestion (Chapter 04 contract).
  const vector = await embedText(question);

  const raw = vectorIndex.query({
    vector,
    topK: topK * 4, // over-fetch so filters + dedupe still leave enough (Chapter 05)
    filter: (record) => {
      // Authorisation inside the query (Chapter 05 / Chapter 09).
      if (record.metadata.tenantId !== ctx.tenantId) return false;
      if (ctx.roles.length > 0) {
        const acl = String(record.metadata.acl ?? "public");
        if (!ctx.roles.includes(acl) && acl !== "public") return false;
      }
      return true;
    },
  });

  // Score floor removes obvious noise; never guess a threshold in production — calibrate.
  const filtered = raw.filter((m) => m.score >= SCORE_FLOOR);

  // Dedupe: max MAX_PER_DOC chunks per source document.
  const byDoc = new Map<string, number>();
  const deduped: Match[] = [];
  for (const match of filtered) {
    const source = String(match.metadata.source ?? match.id);
    const count = byDoc.get(source) ?? 0;
    if (count >= MAX_PER_DOC) continue;
    byDoc.set(source, count + 1);
    deduped.push(match);
  }

  return deduped.slice(0, topK);
}