# Chapter 05: The Tools Primitive — Executable Capability

## Key Concepts

- **Tools** = "do" capabilities (execute actions)
- Tool definition: name, description, inputSchema
- Description is the model's only guidance (not documentation)
- OutputSchema makes result a contract, not a blob of prose
- Annotations are hints for host policy, never enforcement

## Code Implementation

### `src/tools/tools.ts` — Tool Definitions

```typescript
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { taskService } from "../services/taskService.js";

/**
 * Chapter 05 — The Tools Primitive.
 *
 * A tool is a contract written for a reader who cannot read your code: the
 * model sees exactly three things — `name`, `description`, `inputSchema` — and
 * the description is the prompt. It is not documentation.
 */

/** The result contract shared by the tools that return a task. */
const taskSchema = z.object({
  id: z.number().describe("Server-assigned task id"),
  title: z.string().describe("Exact task title"),
  status: z.enum(["PENDING", "COMPLETED"]),
});

export function registerTools(server: McpServer): void {
  server.registerTool(
    "create_task",
    {
      title: "Create Task",
      description:
        "Creates a new task. Use when the user wants to add or remember something to do. Do not use it to read or complete tasks.",
      inputSchema: z.object({
        title: z.string().min(1).describe("Title of the task to create"),
      }),
      // Chapter 05 §5.6 — declaring an outputSchema makes the result a contract
      // the client can validate, not a blob of prose.
      outputSchema: taskSchema,
      // Chapter 05 §5.3 — annotations are hints for host policy, never enforcement.
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ title }) => {
      const task = taskService.create(title);
      return {
        content: [{ type: "text" as const, text: `Task #${task.id} created: ${task.title} (${task.status})` }],
        structuredContent: task,
      };
    },
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List Tasks",
      description: "Returns every task with its id, title and status. Read-only; call it before completing a task whose title you do not know exactly.",
      inputSchema: z.object({}),
      outputSchema: z.object({ tasks: z.array(taskSchema) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const tasks = taskService.list();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(tasks) }],
        structuredContent: { tasks },
      };
    },
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete Task",
      description: "Marks a pending task as COMPLETED using its exact title. Call list_tasks first when the title is uncertain.",
      inputSchema: z.object({
        title: z.string().min(1).describe("Exact title of the task to complete"),
      }),
      outputSchema: taskSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ title }) => {
      const task = taskService.complete(title);

      // Chapter 05 §5.7 — a *tool execution error*: the call ran and the outcome
      // failed. This is a result with `isError: true`, not a JSON-RPC error, and
      // the text lands in the model's context — so it must say how to recover.
      if (!task) {
        return {
          content: [
            { type: "text" as const, text: `No pending task titled "${title}". Call list_tasks to read the exact titles, then retry.` },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: `Task completed: ${task.title} (${task.status})` }],
        structuredContent: task,
      };
    },
  );
}
```

## Code Block Explanation

### Shared: `taskSchema`

```typescript
const taskSchema = z.object({
  id: z.number().describe("Server-assigned task id"),
  title: z.string().describe("Exact task title"),
  status: z.enum(["PENDING", "COMPLETED"]),
});
```

1. **`z.object({...})`** — Defines the Zod schema for a Task object. This serves as both the **outputSchema** (for result validation) and documentation for the model.
2. **`describe(...)`** — Adds human-readable descriptions to each field. These help the model understand what each field means.

### Tool 1: `create_task`

```typescript
server.registerTool(
  "create_task",
  {
    title: "Create Task",
    description: "Creates a new task. Use when the user wants to add or remember something to do. Do not use it to read or complete tasks.",
    inputSchema: z.object({
      title: z.string().min(1).describe("Title of the task to create"),
    }),
    outputSchema: taskSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ title }) => {
    const task = taskService.create(title);
    return {
      content: [{ type: "text" as const, text: `Task #${task.id} created: ${task.title} (${task.status})` }],
      structuredContent: task,
    };
  },
);
```

**Block-by-block breakdown:**

1. **`"create_task"`** — Unique tool name the model uses to request this tool.
2. **`title: "Create Task"`** — Human-readable title for UI display.
3. **`description`** — **The model's only guidance** on when to use this tool. Must be precise and actionable. Not documentation — this IS the prompt the model sees.
4. **`inputSchema`** — Zod schema validating the arguments. `z.string().min(1)` ensures a non-empty title.
5. **`outputSchema: taskSchema`** — Makes the result a contract. The client validates the returned `structuredContent` against this schema.
6. **`annotations`** — Host policy hints (not guarantees):
   - `readOnlyHint: false` — This tool modifies state (creates a task)
   - `destructiveHint: false` — Not destructive (doesn't delete data)
   - `idempotentHint: false` — Not safe to retry blindly (each call creates a new task)
   - `openWorldHint: false` — No unbounded external interaction
7. **Handler function** — The actual execution logic:
   - Destructures `title` from validated input
   - Calls `taskService.create(title)` — pure business logic
   - Returns `{ content: [...], structuredContent: task }`
     - `content`: Human-readable text blocks for the model's context
     - `structuredContent`: Machine-readable object validated against `outputSchema`

### Tool 2: `list_tasks`

```typescript
server.registerTool(
  "list_tasks",
  {
    title: "List Tasks",
    description: "Returns every task with its id, title and status. Read-only; call it before completing a task whose title you do not know exactly.",
    inputSchema: z.object({}),
    outputSchema: z.object({ tasks: z.array(taskSchema) }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    const tasks = taskService.list();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(tasks) }],
      structuredContent: { tasks },
    };
  },
);
```

**Key differences from `create_task`:**
- **`inputSchema: z.object({})`** — No arguments needed
- **`readOnlyHint: true`** — Pure read operation, safe to call anytime
- **`idempotentHint: true`** — Safe to retry (no side effects)
- **Output wraps tasks array** — `z.object({ tasks: z.array(taskSchema) })`

### Tool 3: `complete_task`

```typescript
server.registerTool(
  "complete_task",
  {
    title: "Complete Task",
    description: "Marks a pending task as COMPLETED using its exact title. Call list_tasks first when the title is uncertain.",
    inputSchema: z.object({
      title: z.string().min(1).describe("Exact title of the task to complete"),
    }),
    outputSchema: taskSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ title }) => {
    const task = taskService.complete(title);

    if (!task) {
      return {
        content: [
          { type: "text" as const, text: `No pending task titled "${title}". Call list_tasks to read the exact titles, then retry.` },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: `Task completed: ${task.title} (${task.status})` }],
      structuredContent: task,
    };
  },
);
```

**Key patterns:**

1. **Tool execution error (`isError: true`)** — When the task isn't found:
   - Returns a result with `isError: true` (NOT a JSON-RPC protocol error)
   - The text tells the model **how to recover**: "Call list_tasks to read the exact titles, then retry"
   - This becomes part of the model's context so it can try again

2. **`idempotentHint: true`** — Safe to retry because completing an already-completed task is a no-op

## Key Fields Explained

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Unique identifier model uses | `"create_task"` |
| `description` | Model's only guidance on when to use | `"Creates a new task..."` |
| `inputSchema` | Zod schema for valid arguments | `{ title: z.string().min(1) }` |
| `outputSchema` | Result contract for validation | `taskSchema` |
| `annotations` | Host policy hints | `{ readOnlyHint: true }` |

## Tool Execution Pattern

```typescript
// Tool calls return content blocks, never a bare value
return {
  content: [{ type: "text" as const, text: "..." }],
  structuredContent: task, // Structured result for client validation
};
```

## Command

```bash
npm run client   # Run client lifecycle demo showing tools discovery and invocation
```