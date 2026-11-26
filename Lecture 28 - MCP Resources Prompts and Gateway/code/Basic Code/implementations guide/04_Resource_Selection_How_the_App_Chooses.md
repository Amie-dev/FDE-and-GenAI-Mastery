# Chapter 04 — Resource Selection: How the App Chooses

> **Goal of this chapter:** see the one file that implements the four strategies Chapter 05
> names — rules, retrieval, state, user — and combines them into a pipeline.

---

## 4.1 File details

| | |
|---|---|
| **Path** | `src/services/resourceSelector.ts` |
| **Purpose** | how the APPLICATION picks a Resource — four strategies, each recording *why* |
| **Imports** | none (pure TypeScript) |
| **Exports** | `selectByUser`, `selectByState`, `selectByRetrieval`, `selectByRules`, `selectResources` |
| **Depends on** | nothing in `src/` |
| **Implements** | Lecture 05 (user selection / application state / retrieval / LLM fallback) |

---

## 4.2 Commands

Nothing to run on its own — it is imported by `client.ts`. To check it type-checks:

```bash
npm run typecheck
```

---

## 4.3 Full file

**Path:** `src/services/resourceSelector.ts`

```ts
export type CatalogueEntry = {
  uri: string;
  description: string;
};

export type Selection = {
  uri: string;
  strategy: string;
};

/**
 * Strategy 1 — user selection.
 * The human picked a URI explicitly; nothing to compute.
 */
export function selectByUser(uri: string): Selection[] {
  return [{ uri, strategy: "user" }];
}

/**
 * Strategy 2 — application state.
 * The application already knows the answer (open file, ticket, tenant).
 * No inference, no model call — just map state to a URI.
 */
export function selectByState(stateUri: string): Selection[] {
  return [{ uri: stateUri, strategy: "state" }];
}

/**
 * Strategy 3 — retrieval / search.
 * Keyword match against Resource descriptions. Chapter 05 says a real host
 * would embed both the query and the descriptions, but a keyword filter is
 * enough to teach the point and needs no model.
 */
export function selectByRetrieval(query: string, catalogue: CatalogueEntry[]): Selection[] {
  const tokens = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);

  return catalogue
    .map((entry) => {
      const text = `${entry.uri} ${entry.description}`.toLowerCase();
      const score = tokens.filter((t) => text.includes(t)).length;

      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => ({ uri: r.entry.uri, strategy: "retrieval" }));
}

/**
 * Strategy 4 — rules.
 * ACL-style narrowing before any ranking happens.
 */
export function selectByRules(catalogue: CatalogueEntry[], allowedPrefixes: string[]): Selection[] {
  return catalogue
    .filter((entry) => allowedPrefixes.some((prefix) => entry.uri.startsWith(prefix)))
    .map((entry) => ({ uri: entry.uri, strategy: "rules" }));
}

/**
 * The combined pipeline Chapter 05 describes:
 *   rules → retrieval → user override → fallback.
 *
 * Returns at most three Resources, deduplicated by URI.
 */
export function selectResources(query: string, catalogue: CatalogueEntry[]): Selection[] {
  const byRetrieval = selectByRetrieval(query, catalogue);
  const byRules = selectByRules(catalogue, ["task://", "user://"]);

  const seen = new Set<string>();
  const combined: Selection[] = [];

  for (const s of [...byRules, ...byRetrieval]) {
    if (seen.has(s.uri)) continue;
    seen.add(s.uri);
    combined.push(s);
  }

  return combined.slice(0, 3);
}
```

---

## 4.4 Block-by-block explanation

### Block 1 — types

```ts
export type CatalogueEntry = {
  uri: string;
  description: string;
};

export type Selection = {
  uri: string;
  strategy: string;
};
```

- `CatalogueEntry` is what `resources/list` returns, narrowed to the fields this chapter
  needs. `description` is required here — Lecture 03 §3.6 says it is retrieval text.
- `Selection` pairs a chosen URI with the strategy that chose it, so the host can log and
  audit the decision.

### Block 2 — Strategy 1: user selection

```ts
export function selectByUser(uri: string): Selection[] {
  return [{ uri, strategy: "user" }];
}
```

- Lecture 05 §5.2: the human ticks "Leave Policy" and the app reads exactly that URI.
- Nothing to compute — no model call, no ranking, just pass the URI through.

### Block 3 — Strategy 2: application state

```ts
export function selectByState(stateUri: string): Selection[] {
  return [{ uri: stateUri, strategy: "state" }];
}
```

- Lecture 05 §5.3: the IDE already knows `file://project/src/OrderController.java`, so no
  inference is needed. Map application state to a URI, read it.
- This is the zero‑cost strategy: no model call, no embedding, no lookup.

### Block 4 — Strategy 3: retrieval / search

```ts
export function selectByRetrieval(query: string, catalogue: CatalogueEntry[]): Selection[] {
  const tokens = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  ...
}
```

- Lecture 05 §5.4: a real host embeds both the query and the Resource descriptions and
  ranks by cosine similarity. Here we use keyword overlap — enough to teach the point,
  needs no model, no embeddings.
- Steps: tokenise the query → for each catalogue entry, score how many tokens appear in
  `uri + description` → keep positive scores → sort descending → take top‑3 → return
  selections tagged `"retrieval"`.

### Block 5 — Strategy 4: rules

```ts
export function selectByRules(catalogue: CatalogueEntry[], allowedPrefixes: string[]): Selection[] {
  return catalogue
    .filter((entry) => allowedPrefixes.some((prefix) => entry.uri.startsWith(prefix)))
    .map((entry) => ({ uri: entry.uri, strategy: "rules" }));
}
```

- Lecture 05 §5.7: ACL filtering before ranking. Only Resources whose URI starts with an
  allowed prefix survive — e.g. `task://` and `user://` but not `database://`.
- Tagged `"rules"` so the host can audit that the choice was policy‑driven.

### Block 6 — combined pipeline

```ts
export function selectResources(query: string, catalogue: CatalogueEntry[]): Selection[] {
  const byRetrieval = selectByRetrieval(query, catalogue);
  const byRules = selectByRules(catalogue, ["task://", "user://"]);
  ...
}
```

- Lecture 05 §5.7: real hosts combine. The pipeline concatenates rules then retrieval,
  deduplicates by URI, and caps at three results.
- Order matters: rules come first so ACL always wins over relevance.
- `seen` set deduplicates — if rules and retrieval both pick `task://guidelines`, it is
  returned once.

---

## 4.5 Run / verify

```bash
npm run typecheck    # silent, exit 0
```

This file has no runtime entry point — it is loaded by `client.ts` (the `ask` path).

---

## 4.6 Checkpoint

1. **Why is retrieval last after rules?** → rules are ACL/policy and must win before any
   ranking happens; retrieval only ranks what is already allowed.
2. **Why is there no LLM fallback here?** → Chapter 05 §5.5 names LLM‑based routing as the
   expensive fifth strategy; this Basic Code keeps to the four that need no model, proving
   the point.
3. **Why does each `Selection` carry `strategy`?** → so the host can log and audit *why* a
   particular Resource was read — one log line per selection with strategy, URI, score.
4. **Why cap at three results?** → Lecture 03 §3.8 size discipline — bounded context per request.

**Next:** [Chapter 05 — Prompts: Reusable Templates with Arguments](./05_Prompts_Reusable_Templates_with_Arguments.md)