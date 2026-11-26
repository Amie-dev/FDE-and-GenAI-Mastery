import { createLogger } from "../config/config.js";

const logger = createLogger("services/resourceSelector");

export type ResourceCatalogue = {
  uri: string;
  description?: string;
};

export type ResourceSelection = {
  uri: string;
  strategy: "rules" | "retrieval" | "state" | "user" | "none";
};

/**
 * Chapter 05 — How the Application Chooses a Resource.
 *
 * The application owns the trigger on Resources. It does not ask the model
 * which context to provide — it picks context itself, using four strategies
 * in priority order:
 *
 *   1. user override   — explicit user request (highest priority)
 *   2. state           — the application knows what state it is in
 *   3. retrieval       — keyword / embedding similarity match
 *   4. rules           — hard-coded business rules (lowest priority)
 *
 * The result is a ranked list, capped at the top 3, each tagged with the
 * strategy that selected it so the log line records *why* it was read.
 */
export function selectResources(
  message: string,
  catalogue: ResourceCatalogue[],
  userOverride?: string,
): ResourceSelection[] {
  const selections: ResourceSelection[] = [];

  // 1. user override — explicit, takes priority over everything else
  if (userOverride) {
    const match = catalogue.find((r) => r.uri === userOverride);
    if (match) {
      selections.push({ uri: match.uri, strategy: "user" });
    }
  }

  // 2. state — if the message mentions a project or user, prefer those
  const projectMatch = message.match(/project:\s*([a-z0-9-]+)/i);
  if (projectMatch) {
    const uri = `task://projects/${projectMatch[1]}`;
    const match = catalogue.find((r) => r.uri === uri);
    if (match) {
      selections.push({ uri: match.uri, strategy: "state" });
    }
  }

  const userMatch = message.match(/user:\s*(\d+)/i);
  if (userMatch) {
    const uri = `user://${userMatch[1]}/profile`;
    const match = catalogue.find((r) => r.uri === uri);
    if (match) {
      selections.push({ uri: match.uri, strategy: "state" });
    }
  }

  // 3. retrieval — keyword similarity
  const keywords = message.toLowerCase().split(/\s+/);
  const scored = catalogue
    .map((r) => {
      const text = `${r.uri} ${r.description ?? ""}`.toLowerCase();
      const score = keywords.reduce((sum, kw) => sum + (text.includes(kw) ? 1 : 0), 0);
      return { resource: r, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  for (const s of scored) {
    if (!selections.find((sel) => sel.uri === s.resource.uri)) {
      selections.push({ uri: s.resource.uri, strategy: "retrieval" });
    }
  }

  // 4. rules — hard-coded business rules (lowest priority)
  const rules: ResourceCatalogue[] = [
    { uri: "task://guidelines", description: "Task management guidelines" },
    { uri: "task://backlog", description: "Current backlog" },
    { uri: "task://summary", description: "Task summary" },
  ];

  for (const rule of rules) {
    if (!selections.find((sel) => sel.uri === rule.uri)) {
      selections.push({ uri: rule.uri, strategy: "rules" });
    }
  }

  // Deduplicate and cap at 3
  const unique = selections.filter((s, i, arr) => arr.findIndex((u) => u.uri === s.uri) === i);

  logger.info({ message, selected: unique }, "Resource selection complete");

  return unique.slice(0, 3);
}