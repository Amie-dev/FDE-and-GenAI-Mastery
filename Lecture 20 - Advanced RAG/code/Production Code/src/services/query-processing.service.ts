import { QueryTranslation, RouteDecision } from "../types/index";

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

export function stepBack(query: string): string {
  return `What is the general principle behind: ${query}`;
}

export function routeQuery(query: string): RouteDecision {
  const q = query.toLowerCase();
  if (q.includes("plan") || q.includes("subscription") || q.includes("account")) {
    return { source: "sql", reason: "account/subscription lookup → SQL" };
  }
  if (q.includes("file") || q.includes("pdf") || q.includes("document")) {
    return { source: "s3", reason: "file/object storage → S3" };
  }
  return { source: "vector", reason: "semantic knowledge → vector store" };
}

export function processQuery(query: string): {
  translation: QueryTranslation;
  stepback: string;
  route: RouteDecision;
} {
  const translation = rewriteQuery(query);
  const stepback = stepBack(query);
  const route = routeQuery(query);

  return { translation, stepback, route };
}