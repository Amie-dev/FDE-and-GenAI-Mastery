# Chapter 03 — Resources: Static, Dynamic, Templated

> **Goal of this chapter:** see the one file that registers every Resource, maps each of
> the three shapes from Chapter 04, and links to the shared data layer.

---

## 3.1 File details

| | |
|---|---|
| **Path** | `src/resources/resources.ts` |
| **Purpose** | register five Resources (one static, two dynamic, two templated) with the MCP Server |
| **Imports** | `ResourceTemplate` from `@modelcontextprotocol/server`, `taskScheme` / `userScheme` from `config/config.ts`, text views from `taskService` |
| **Exports** | `registerResources` (the single function that adds all five Resources) |
| **Depends on** | `src/config/config.ts` (URI schemes), `src/services/taskService.ts` (text views) |
| **Implements** | Lecture 04 (static / dynamic / templated Resources), Lecture 03 §3.4‑3.8 (name / URI / description / MIME type / content) |

---

## 3.2 Commands

Nothing to run on its own — it is imported by `server.ts` at process start. To check it type-checks:

```bash
npm run typecheck
```

---

## 3.3 Full file

**Path:** `src/resources/resources.ts`

```ts
import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/server";

import { taskScheme, userScheme } from "../config/config.js";
import { backlogText, guidelines as staticGuidelines, profileText, projectText, summaryText } from "../services/taskService.js";

/**
 * Chapter 03/04 — Resources: addressable context, controlled by the APPLICATION.
 *
 * Every registration below is one of the three shapes Chapter 04 describes:
 *
 *   STATIC     a fixed URI whose content never changes
 *   DYNAMIC    a fixed URI whose content is recomputed on every read
 *   TEMPLATED  one definition that serves a whole family of URIs
 *
 * Reading any of these executes nothing — a Resource is *know*, never *do*.
 */

/* ── 1 · STATIC — same URI, same bytes, every time ────────────────────── */

const guidelines = staticGuidelines;

export function registerResources(server: McpServer): void {
  /* ── 1 · STATIC — same URI, same bytes, every time ────────────────────── */

  server.registerResource(
    "guidelines",
    `${taskScheme}://guidelines`,
    {
      title: "Task management guidelines",
      description:
        "Company rules for prioritising and scheduling tasks. Read this before planning anyone's day.",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/plain", text: guidelines }],
    }),
  );

  /* ── 2 · DYNAMIC — same URI, content recomputed on every `resources/read` ─ */

  server.registerResource(
    "backlog",
    `${taskScheme}://backlog`,
    {
      title: "Open backlog",
      description:
        "Every task that is not done yet, with its priority, project and owner. Use this when the user asks what is on their plate.",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/plain", text: backlogText() }],
    }),
  );

  server.registerResource(
    "summary",
    `${taskScheme}://summary`,
    {
      title: "Workload summary",
      description:
        "Counts of open tasks by priority, plus the projects they belong to. Use this to answer questions like 'how busy am I?'.",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/plain", text: summaryText() }],
    }),
  );

  /* ── 3 · TEMPLATED — one definition, a whole family of URIs ───────────── */

  server.registerResource(
    "project",
    new ResourceTemplate(`${taskScheme}://projects/{projectId}`, { list: undefined }),
    {
      title: "Project brief",
      description:
        "Every task in one project. Replace {projectId} with a project such as fde or media.",
      mimeType: "text/plain",
    },
    async (uri, variables) => {
      const projectId = String(variables.projectId);

      return {
        contents: [{ uri: uri.href, mimeType: "text/plain", text: projectText(projectId) }],
      };
    },
  );

  server.registerResource(
    "user-profile",
    new ResourceTemplate(`${userScheme}://{userId}/profile`, { list: undefined }),
    {
      title: "User profile",
      description: "A person's profile and open workload. Replace {userId} with an id such as 123.",
      mimeType: "text/plain",
    },
    async (uri, variables) => {
      const userId = String(variables.userId);

      return {
        contents: [{ uri: uri.href, mimeType: "text/plain", text: profileText(userId) }],
      };
    },
  );
}
```

---

## 3.4 Block-by-block explanation

### Block 1 — the import tower

```ts
import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/server";
import { taskScheme, userScheme } from "../config/config.js";
import { backlogText, guidelines as staticGuidelines, profileText, projectText, summaryText } from "../services/taskService.js";
```

- `ResourceTemplate` is the MCP SDK's way of saying "this URI has a variable part".
- `taskScheme` / `userScheme` are the scheme constants from `config.ts` — change them in one place and every URI updates.
- The five text‑view functions come from `taskService`, which is the shared data layer. Every Resource handler below calls one of them.

### Block 2 — the STATIC resource

```ts
const guidelines = staticGuidelines;

server.registerResource(
  "guidelines",
  `${taskScheme}://guidelines`,
  {
    title: "Task management guidelines",
    description: "Company rules for prioritising and scheduling tasks. Read this before planning anyone's day.",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/plain", text: guidelines }],
  }),
);
```

- The URI is `task://guidelines`. It is a **literal string** — no template, no variable.
- The handler takes nothing (`(uri) => …`) and returns the **same** `guidelines` string every time.
- This is the *static* shape: same bytes forever, cached aggressively, failure‑free.

### Block 3 — the first DYNAMIC resource

```ts
server.registerResource(
  "backlog",
  `${taskScheme}://backlog`,
  {
    title: "Open backlog",
    description: "Every task that is not done yet, with its priority, project and owner. Use this when the user asks what is on their plate.",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/plain", text: backlogText() }],
  }),
);
```

- URI `task://backlog`. Same pattern as the static one, but the handler calls
  `backlogText()` which reads the mutable `tasks` array — so the content changes
  every time the array changes.
- This is the **dynamic** shape: same URI, recomputed on every read, reflects live state.

### Block 4 — the second DYNAMIC resource

```ts
server.registerResource(
  "summary",
  `${taskScheme}://summary`,
  {
    title: "Workload summary",
    description: "Counts of open tasks by priority, plus the projects they belong to. Use this to answer questions like 'how busy am I?'.",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/plain", text: summaryText() }],
  }),
);
```

- URI `task://summary`. Another dynamic Resource, but it renders *derived* data (counts
  of open tasks, project list) rather than the raw list.
- Shows that dynamic Resources can compute summaries, not just raw listings.

### Block 5 — the first TEMPLATED resource

```ts
server.registerResource(
  "project",
  new ResourceTemplate(`${taskScheme}://projects/{projectId}`, { list: undefined }),
  {
    title: "Project brief",
    description: "Every task in one project. Replace {projectId} with a project such as fde or media.",
    mimeType: "text/plain",
  },
  async (uri, variables) => {
    const projectId = String(variables.projectId);
    return {
      contents: [{ uri: uri.href, mimeType: "text/plain", text: projectText(projectId) }],
    };
  },
);
```

- URI pattern `task://projects/{projectId}`. The `{projectId}` part is a **template variable**.
- `{ list: undefined }` tells the SDK not to list this as a concrete entry in `resources/list`
  (it is a pattern, not a concrete Resource — see Lecture 04 §4.7).
- The handler receives `variables.projectId`, converts it to a string, and passes it to
  `projectText()` which renders only that project's tasks.
- This one definition serves `task://projects/fde`, `task://projects/media`, etc. — infinitely
  many concrete Resources from one registration.

### Block 6 — the second TEMPLATED resource

```ts
server.registerResource(
  "user-profile",
  new ResourceTemplate(`${userScheme}://{userId}/profile`, { list: undefined }),
  {
    title: "User profile",
    description: "A person's profile and open workload. Replace {userId} with an id such as 123.",
    mimeType: "text/plain",
  },
  async (uri, variables) => {
    const userId = String(variables.userId);
    return {
      contents: [{ uri: uri.href, mimeType: "text/plain", text: profileText(userId) }],
    };
  },
);
```

- URI pattern `user://{userId}/profile`. The `{userId}` part is the template variable.
- Same shape as the `project` template, but for per‑user data.
- A single handler serves `user://123/profile`, `user://456/profile`, etc.

---

## 3.5 Run / verify

```bash
npm run typecheck    # silent, exit 0
```

This file has no runtime entry point — it is loaded by `server.ts` at process start, as part
of `createServer()`.

---

## 3.7 Checkpoint

1. **What makes `guidelines` static?** → the handler takes nothing and returns the same string every time; content never changes until the process restarts.
2. **What makes `backlog` dynamic?** → the handler calls `backlogText()`, which reads the mutable `tasks` array — so it changes every time a Task is created or completed.
3. **What makes `project` templated?** → one `ResourceTemplate` definition (`task://projects/{projectId}`) serves infinitely many concrete URIs; `resources/list` never lists them individually.
4. **What does `{ list: undefined }` do?** → tells the SDK to omit this template from `resources/list` output; it is a pattern, not a list entry. Discovery uses `resources/templates/list` instead.
5. **Why do `backlog` and `summary` both read `tasks`?** → they are two different *views* of the same mutable data. The application chooses which one to read.

**Next:** [Chapter 04 — Resource Selection: How the App Chooses](./04_Resource_Selection_How_the_App_Chooses.md)