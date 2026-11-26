# Chapter 03: MCP vs Tool Calling — Two Complementary Layers

## Key Concepts

- **Tool calling** = selection — the model decides *which* capability to use
- **MCP** = delivery — the application routes the tool request to the *right server*
- The baton passes **once**: after the model's tool choice (step 4), everything is deterministic
- MCP does **not** replace tool calling; they operate at different layers

## The Lifecycle Pattern

```
USER → LLM picks tool (probabilistic step 4)
            ↓
HOST routes tool call deterministically (steps 1-3, 5-9)
            ↓
CLIENT discovers tools, invokes with correct args (steps 1, 5, 7)
            ↓
SERVER executes business logic, returns result (steps 3, 6)
```

## Code: Tool Definitions in `src/tools/tools.ts`

```typescript
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { taskService } from "../services/taskService.js";

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
      description: "Creates a new task. Use when the user wants to add or remember something to do.",
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
}
```

## Code Block Explanation

### Tool Definition Structure

1. **`import * as z from "zod/v4"`** — Imports Zod v4 for JSON Schema validation. Tool inputs are validated against this schema before execution.

2. **`taskSchema`** — The **output contract**: defines what a `Task` looks like. The client can validate results, not just see prose. Describes fields: `id`, `title`, `status`.

3. **`registerTools(server)`** — Registers executable capabilities:
   - **`name`**: Unique identifier `create_task` — what the model uses to request the tool
   - **`description`**: The model's *only guidance* — clearly explain when to use this tool
   - **`inputSchema`**: Zod schema for valid arguments. `z.string().min(1)` ensures non-empty title
   - **`outputSchema`**: Result the client validates (not just a text blob)
   - **`annotations`**: Host policy hints (never guarantees):
     - `readOnlyHint: false` — may modify state
     - `destructiveHint: false` — not destructive
     - `idempotentHint: false` — not safe to retry blindly
     - `openWorldHint: false` — limited external interaction

4. **Handler function `async ({ title }) => { ... }`** — This is the actual business logic:
   - Destructures `title` from validated input
   - Calls `taskService.create(title)` — pure deterministic code
   - Returns `content` array (text block) and `structuredContent` (validated object)
   - No protocol error here — any failure becomes `isError: true` in the result

## Tool Execution Flow

When the model decides to create a task:

```
1. DISCOVERY → client.listTools() → sees "create_task" definition
2. SELECTION   → LLM reads description, decides to call it
3. INVOCATION  → host calls client.callTool({ name: "create_task", arguments: { title: "..." } })
4. EXECUTION   → server's handler runs, returns result
5. RETURN      → result goes back to client → host → model becomes context
```

## Key Distinction: Protocol vs Tool Calling

| Layer | Responsibility | Who Decides |
|-------|---------------|-------------|
| **Tool Calling** | Which tool to use | Model (probabilistic) |
| **MCP Protocol** | Where tool lives and how to reach it | Application (deterministic) |

## Command

```bash
# Run client lifecycle demo
npm run client
```

The client demonstrates:
- `listTools()` — discover what tools exist
- `callTool()` — invoke with correct arguments
- Error handling with `isError: true`