# Chapter 6 — Query Processing (Translation, Routing, Decomposition, HyDE)

**Goal:** Transform the raw user query into retrieval-friendly representations before the retriever sees it, and route to the right data source.
**Notes reference:** `notes/06_Query_Processing.md`
**File:** `src/services/query-processing.service.ts`
**Order:** Run after Chapter 5.

---

## 6.1 File Details

**`src/services/query-processing.service.ts`**

```ts
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
    return { source: "object", reason: "file/object storage → object storage" };
  }
  return { source: "vector", reason: "semantic knowledge → vector store" };
}

export function processQuery(query: string) {
  const translation = rewriteQuery(query);
  const stepback = stepBack(query);
  const route = routeQuery(query);

  return { translation, stepback, route };
}
```

**Block-by-block:**
- `QueryTranslation` — original query + rewritten (clearer) version.
- `RouteDecision` — which data source (`vector` / `sql` / `object`) and why.
- `rewriteQuery` — expands abbreviations/fixes spelling (e.g. `gemni` → `Gemini`, `429` → `429 rate limit`) so the embedding matches document terms better (Chapter 06 §6.3).
- `stepBack` — abstracts to a higher-level principle (Chapter 06 §6.4).
- `routeQuery` — decides data source based on keywords:
  - plan/subscription/account → SQL (structured data)
  - file/pdf/document → object storage
  - everything else → vector store (semantic knowledge)
  Returns structured intent, not raw SQL (Chapter 06 §6.11: router outputs intent, validation/auth live in the app).
- `processQuery` — runs rewrite + step-back + routing together (Chapter 06 §6.13).

---

## 6.2 Commands

```bash
npx ts-node -e "
import { processQuery } from './src/services/query-processing.service';
console.log(processQuery('how fix 429 gemni node'));
console.log(processQuery('what is my subscription plan?'));
"
```

---

## 6.3 What This Implements from the Notes

| Notes concept | Implementation |
|---|---|
| Query rewriting | `rewriteQuery` expands abbreviations |
| Step-back prompting | `stepBack` abstracts to principles |
| Query routing | `routeQuery` → vector/sql/object |
| Structured intent output | `RouteDecision` (not raw SQL) |
| Parallel-friendly | `processQuery` returns all three independently |
