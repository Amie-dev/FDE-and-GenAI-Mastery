import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/server";

import { backlogText, guidelines as staticGuidelines, profileText, projectText, summaryText } from "../services/taskService.js";

/**
 * Chapter 03/04 — Resources: addressable context, controlled by the APPLICATION.
 *
 * Every registration below is one of the three shapes Chapter 04 describes:
 *
 *   STATIC     a fixed URI whose content never changes
 *   DYNAMIC   a fixed URI whose content is recomputed on every read
 *   TEMPLATED one definition that serves a whole family of URIs
 *
 * Reading any of these executes nothing — a Resource is *know*, never *do*.
 */
export function registerResources(server: McpServer): void {
  /* ── 1 · STATIC — same URI, same bytes, every time ────────────────────── */

  server.registerResource(
    "guidelines",
    "task://guidelines",
    {
      title: "Task management guidelines",
      description:
        "Company rules for prioritising and scheduling tasks. Read this before planning anyone's day.",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/plain", text: staticGuidelines }],
    }),
  );

  /* ── 2 · DYNAMIC — same URI, content recomputed on every `resources/read` ─ */

  server.registerResource(
    "backlog",
    "task://backlog",
    {
      title: "Open backlog",
      description:
        "Every task that is not done yet. Use this when the user asks what is on their plate.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [{ uri: "task://backlog", mimeType: "text/plain", text: backlogText() }],
    }),
  );

  server.registerResource(
    "summary",
    "task://summary",
    {
      title: "Workload summary",
      description:
        "Counts of open tasks by priority, plus the projects they belong to.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [{ uri: "task://summary", mimeType: "text/plain", text: summaryText() }],
    }),
  );

  /* ── 3 · TEMPLATED — one definition, a whole family of URIs ───────────── */

  server.registerResource(
    "project",
    new ResourceTemplate("task://projects/{projectId}", { list: undefined }),
    {
      title: "Project brief",
      description:
        "Every task in one project. Replace {projectId} with a project such as fde or media.",
      mimeType: "text/plain",
    },
    async (_uri, variables) => {
      const projectId = String(variables.projectId);

      return {
        contents: [{ uri: `task://projects/${projectId}`, mimeType: "text/plain", text: projectText(projectId) }],
      };
    },
  );

  server.registerResource(
    "user-profile",
    new ResourceTemplate("user://{userId}/profile", { list: undefined }),
    {
      title: "User profile",
      description: "A person's profile and open workload. Replace {userId} with an id such as 123.",
      mimeType: "text/plain",
    },
    async (_uri, variables) => {
      const userId = String(variables.userId);

      return {
        contents: [{ uri: `user://${userId}/profile`, mimeType: "text/plain", text: profileText(userId) }],
      };
    },
  );
}