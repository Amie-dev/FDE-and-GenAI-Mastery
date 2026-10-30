# Chapter 06 — Tools & Server Assembly

> **Goal of this chapter:** see the Tool registrations and the server factory that wires
> all three primitives together.

---

## 6.1 File details

| | |
|---|---|
| **Paths** | `src/tools/tools.ts`, `src/server/server.ts` |
| **Purpose** | Tool definitions (`tools.ts`) and the `createServer()` factory that registers
> all three primitives in one function (`server.ts`). |
| **Imports** | `McpServer` from `@modelcontextprotocol/server`, Zod, text views from `taskService` |
| **Exports** | `registerTools` (tools.ts), `createServer` (server.ts) |
| **Depends on** | `src/config/config.ts` (serverInfo), `src/services/taskService.ts` (backlogText, etc.) |
| **Implements** | Lecture 01 (the three primitives registered in one function), Lecture 02 (`list_tasks` vs `task://backlog`), Lecture 07 §7.5 (the model step after prompts/get) |

---

## 6.2 Commands

Nothing to run on its own — both are imported at server start. To check it type-checks:

```bash
npm run typecheck
```

---

## 6.3 Full file: `src/tools/tools.ts`

**Path:** `src/tools/tools.ts`

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { backlogText, completeTask, createTask } from "../services/taskService.js";

/**
 * Chapter 01/02 — Tools: the MODEL holds the trigger.
 *
 * A Tool is verb-named, carries an `inputSchema`, and is allowed to change
 * state. Lecture 14 covered this primitive in depth; these three tools are the
 * minimum needed for Chapter 08's end-to-end request to have something the
 * model can choose to call.
 *
 * Lecture 02's central point: `list_tasks` returns exactly the same text as
 * `task://backlog`. Same payload, different intent: the model decides to call this,
 * the application decides to read that.
 */
export function registerTools(server: McpServer): void {
  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description: "Add a new task to the backlog.",
      inputSchema: z.object({
        title: z.string().describe("Title of the task"),
      }),
    },
    async ({ title }) => ({
      content: [{ type: "text" as const, text: createTask(title) }],
    }),
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "List the tasks that are not done yet.",
      inputSchema: z.object({}),
    },
    // Chapter 02 — note that this returns exactly the same text as the
    // `task://backlog` Resource. Same payload, different intent: the model
    // *decides* to call this, the application *decides* to read that.
    async () => ({
      content: [{ type: "text" as const, text: backlogText() }],
    }),
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete task",
      description: "Mark a task as done, using its exact title.",
      inputSchema: z.object({
        title: z.string().describe("Exact title of the task"),
      }),
    },
    async ({ title }) => ({
      content: [{ type: "text" as const, text: completeTask(title) }],
    }),
  );
}
```

---

## 6.4 Block-by-block explanation

### Block 1 — the import tower

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { backlogText, completeTask, createTask } from "../services/taskService.js";
```

- `type McpServer` — type‑only import from the MCP SDK.
- `z` is Zod v4 — the schema library used to type‑check the `inputSchema` that describes
  what arguments the Tool expects.
- The three functions from `taskService` are shared data: `backlogText()` read by both the
  `list_tasks` Tool and the `task://backlog` Resource (Lecture 02's central point), and
  `createTask` / `completeTask` which mutate the array (Tool‑only behaviour).

### Block 2 — `create_task`: the "Do" Tool

```ts
server.registerTool(
  "create_task",
  {
    title: "Create task",
    description: "Add a new task to the backlog.",
    inputSchema: z.object({
      title: z.string().describe("Title of the task"),
    }),
  },
  async ({ title }) => ({
    content: [{ type: "text" as const, text: createTask(title) }],
  }),
);
```

- `title` is a required string argument from the LLM.
- `createTask(title)` pushes a new task onto the `tasks` array and returns a confirmation string.
- The Tool result wraps it into `content: [{ type: "text", text: … }]` — the MCP SDK shape.
- This Tool **changes state** (adds a task), which is why the model decides *when* to call it.

### Block 3 — `list_tasks`: the shared payload, different owner

```ts
server.registerTool(
  "list_tasks",
  {
    title: "List tasks",
    description: "List the tasks that are not done yet.",
    inputSchema: z.object({}),
  },
  // Chapter 02 — note that this returns exactly the same text as the
  // `task://backlog` Resource. Same payload, different intent: the model
  // *decides* to call this, the application *decides* to read that.
  async () => ({
    content: [{ type: "text" as const, text: backlogText() }],
  }),
);
```

- `inputSchema: z.object({})` — no arguments needed; the model just decides *whether* to call it.
- The handler calls `backlogText()`, exactly the same function the static Resource
  `task://backlog` uses. Lecture 02: same payload, different owner.

### Block 4 — `complete_task`: the "Done" Tool

```ts
server.registerTool(
  "complete_task",
  {
    title: "Complete task",
    description: "Mark a task as done, using its exact title.",
    inputSchema: z.object({
      title: z.string().describe("Exact title of the task"),
    }),
  },
  async ({ title }) => ({
    content: [{ type: "text" as const, text: completeTask(title) }],
  }),
);
```

- Finds the task by title, flips its status to `"done"`, returns a confirmation string.
- Like `create_task`, it **mutates state** — the model decides to call it.

---

## 6.5 Full file: `src/server/server.ts`

**Path:** `src/server/server.ts`

```ts
import { McpServer } from "@modelcontextprotocol/server";

import { serverInfo } from "../config/config.js";
import { registerPrompts } from "../prompts/prompts.js";
import { registerResources } from "../resources/resources.js";
import { registerTools } from "../tools/tools.js";

/**
 * Chapter 01 / Chapter 08 — three primitives, three owners, one standard door.
 *
 * Note what is *not* here: no model, no HTTP, no transport. This factory only
 * declares capabilities, so the very same server can be served over Streamable
 * HTTP (`src/index.ts`) or spawned by a host without changing a line — which is
 * Chapter 01's point that the binding is a detail, not a rewrite.
 */
export function createServer(): McpServer {
  const server = new McpServer(serverInfo);

  registerTools(server); // MODEL holds the trigger        — verbs, schemas, side effects
  registerResources(server); // APPLICATION holds the trigger — nouns, URIs, read-only
  registerPrompts(server); // USER holds the trigger       — message templates

  return server;
}
```

---

## 6.5 Block-by-block explanation (server.ts)

### Block 1 — the factory

```ts
export function createServer(): McpServer {
  const server = new McpServer(serverInfo);
  ...
}
```

- Takes `serverInfo` (name + version) from `config.ts` and hands it to the MCP SDK.
- **Nothing else** lives here: no model, no HTTP, no transport.

### Block 2 — the three registrations, in order

```ts
registerTools(server); // MODEL holds the trigger        — verbs, schemas, side effects
registerResources(server); // APPLICATION holds the trigger — nouns, URIs, read-only
registerPrompts(server); // USER holds the trigger       — message templates
```

- This is the **one‑line integration** Lecture 01's point makes concrete: the very same
  server factory can be served over Streamable HTTP or spawned by any host.
- The order matters for the lecture's narrative but not for the SDK — they are
  independent registrations.

---

## 6.6 Run / verify

```bash
npm run typecheck    # silent, exit 0
npm run server       # starts the MCP server (background)
```

Expected: `[task-mcp-server] v1.0.0 MCP endpoint on http://127.0.0.1:8081/mcp`.

---

## 6.7 Checkpoint

1. **What is the difference between `list_tasks` and `task://backlog`?** → same payload,
   different owner. Model calls Tool; application reads Resource. That is Lecture 02's
   central argument.
2. **Why does `create_task` and `complete_task` mutate state but `list_tasks` does not?**
   → Tools *can* have side effects (the model decides when to invoke them); Resources
   must be read‑only (the application decides when to read them).
3. **Why is `registerTools` called first?** → the lecture builds the narrative from
   Tools → Resources → Prompts, but the SDK does not enforce order.
4. **What is `createServer()`'s single responsibility?** → it wires all three primitives
   into one `McpServer`; it knows nothing about transport, HTTP, or model calls.

**Next:** [Chapter 07 — Client Wiring: `resources/read` & `prompts/get`](./07_Client_Wiring_resources_read_and_prompts_get.md)