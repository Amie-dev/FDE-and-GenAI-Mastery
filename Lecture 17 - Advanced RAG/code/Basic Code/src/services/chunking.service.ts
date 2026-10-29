/**
 * Chapter 02 — Chunking Strategies
 *
 * Fixed-size chunking with overlap. Splits text into searchable units so
 * each chunk carries its own meaning (retrieval unit), fits the prompt
 * (context unit), and can be cited (citation unit).
 *
 * Only implements fixed-size chunking (the most basic strategy from the notes).
 */

export interface Chunk {
  id: string;
  text: string;
  tokens: number;
  start: number;
  end: number;
  metadata: Record<string, unknown>;
}

export interface ChunkingOptions {
  chunkSize: number;   // tokens per chunk
  overlap: number;     // token overlap between chunks
}

/**
 * Very small token approximation (1 token ≈ 4 characters).
 * Used only for this basic implementation.
 */
function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into fixed-size chunks with optional overlap.
 * Boundaries are character-based (approximates token boundaries).
 */
export function chunkText(
  text: string,
  docId: string,
  opts: ChunkingOptions,
  metadata: Record<string, unknown> = {}
): Chunk[] {
  const chunks: Chunk[] = [];
  const total = countTokens(text);
  let start = 0;
  let index = 0;

  while (start < total) {
    const end = Math.min(start + opts.chunkSize, total);
    const slice = text.slice(start * 4, end * 4); // back to characters

    chunks.push({
      id: `${docId}-chunk-${index}`,
      text: slice,
      tokens: countTokens(slice),
      start,
      end,
      metadata: { ...metadata, chunkIndex: index },
    });

    index++;
    if (end >= total) break;
    start = end - opts.overlap; // overlap window
    if (start < 0) start = 0;
  }

  return chunks;
}

/**
 * Structural hint: prepend the section heading so each chunk is
 * self-contained (Chapter 02: "chunk should be understandable on its own").
 */
export function withBreadcrumb(
  chunks: Chunk[],
  breadcrumb: string
): Chunk[] {
  return chunks.map((c) => ({
    ...c,
    text: `${breadcrumb}\n${c.text}`,
    tokens: countTokens(`${breadcrumb}\n${c.text}`),
  }));
}