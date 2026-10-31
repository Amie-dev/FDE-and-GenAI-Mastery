import { Candidate } from "../types/index";

export function chunkText(
  text: string,
  docId: string,
  opts: { chunkSize: number; overlap: number },
  metadata: Record<string, unknown> = {}
): Candidate[] {
  function countTokens(t: string): number {
    return Math.ceil(t.length / 4);
  }

  const chunks: Candidate[] = [];
  const total = countTokens(text);
  let start = 0;
  let index = 0;

  while (start < total) {
    const end = Math.min(start + opts.chunkSize, total);
    const slice = text.slice(start * 4, end * 4);

    chunks.push({
      id: `${docId}-chunk-${index}`,
      text: slice,
      tokens: countTokens(slice),
      start,
      end,
      source: docId,
      metadata: { ...metadata, chunkIndex: index },
      score: 0,
    });

    index++;
    if (end >= total) break;
    start = end - opts.overlap;
    if (start < 0) start = 0;
  }

  return chunks;
}

export function withBreadcrumb(chunks: Candidate[], breadcrumb: string): Candidate[] {
  function countTokens(t: string): number {
    return Math.ceil(t.length / 4);
  }
  return chunks.map((c) => ({
    ...c,
    text: `${breadcrumb}\n${c.text}`,
    tokens: countTokens(`${breadcrumb}\n${c.text}`),
  }));
}