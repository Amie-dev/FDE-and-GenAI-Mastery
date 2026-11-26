/**
 * Chapter 06 — Query Processing (Translation, Routing, Decomposition, HyDE)
 *
 * Transforms the raw user query into retrieval-friendly representations
 * before the retriever sees it. Only query rewriting and routing are
 * implemented here (the minimum from the notes).
 */

export interface QueryTranslation {
  original: string;
  rewritten: string;
}

export interface RouteDecision {
  source: "vector" | "sql" | "object";
  reason: string;
}

/**
 * Query rewriting: expand abbreviations / fix spelling so the embedding
 * matches document terms better (Chapter 06 §6.3).
 */
export function rewriteQuery(query: string): QueryTranslation {
  const expanded = query
    .replace(/\btdz\b/gi, "temporal dead zone")
    .replace(/\bgemni\b/gi, "Gemini")
    .replace(/\b429\b/gi, "429 rate limit");

  return {
    original: query,
    rewritten: expanded.trim() === query.trim() ? query : expanded,
  };
}

/**
 * Step-back: abstract to a higher-level concept (Chapter 06 §6.4).
 * Minimal implementation returns a generic principle query.
 */
export function stepBack(query: string): string {
  return `What is the general principle behind: ${query}`;
}

/**
 * Query router: decides which data source the question belongs to.
 * Returns structured intent (Chapter 06 §6.11 — router outputs intent, not SQL).
 */
export function routeQuery(query: string): RouteDecision {
  const q = query.toLowerCase();
  if (q.includes("plan") || q.includes("subscription") || q.includes("account")) {
    return { source: "sql", reason: "account/subscription lookup → SQL" };
  }
  if (q.includes("file") || q.includes("pdf") || q.includes("document")) {
    return { source: "object", reason: "file/object storage → object storage" };
  }
  return { source: "vector", reason: "semantic knowledge → vector store" };
}

/**
 * Run rewrite + step-back + routing together (Chapter 06 §6.13).
 */
export function processQuery(query: string) {
  const translation = rewriteQuery(query);
  const stepback = stepBack(query);
  const route = routeQuery(query);

  return { translation, stepback, route };
}