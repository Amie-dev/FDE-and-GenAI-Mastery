/**
 * Chapter 05 — how the APPLICATION picks a Resource.
 *
 * MCP does not prescribe selection. This file is the four strategies the
 * lecture names, each recording *why* it chose what it chose, so the host can
 * log and audit the decision later.
 */

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