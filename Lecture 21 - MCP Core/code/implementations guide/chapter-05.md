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
      description: "Creates a new task...",
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
  // ... list_tasks and complete_task similar
}
```

## Key Fields Explained

- `name`: Unique identifier model uses to request the tool (e.g., `create_task`)
- `description`: The model's **only guidance** on when to use the tool
- `inputSchema`: Zod schema defining valid arguments
- `outputSchema`: Result contract (validates output structure)
- `annotations`: Hints for host policy (readOnlyHint, destructiveHint, etc.)

## Tool Execution Pattern

```typescript
// Tool calls return content blocks, never a bare value
return {
  content: [{ type: "text" as const, text: "..." }],
  structuredContent: task, // Structured result for client validation
};
```