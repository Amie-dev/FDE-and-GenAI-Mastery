import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { backlogText, completeTask, createTask } from "../services/taskService.js";

/**
 * Chapter 01/02 — Tools: the MODEL holds the trigger.
 *
 * A Tool is verb-named, carries an `inputSchema`, and is allowed to change
 * state. Chapter 02 notes that `list_tasks` returns exactly the same text as
 * the `task://backlog` Resource. The payload is identical — the difference
 * is who decides. The model decides to call the Tool; the application decides
 * to read that Resource.
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