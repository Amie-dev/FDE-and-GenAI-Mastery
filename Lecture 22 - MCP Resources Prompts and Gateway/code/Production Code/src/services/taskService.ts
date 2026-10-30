import { createLogger } from "../config/config.js";

const logger = createLogger("services/taskService");

export const guidelines = `Task Management Guidelines:
1. Deep work tasks should preferably be done before 12 PM.
2. Always review pull requests before accepting them.
3. Send notifications to users when tasks are completed.
`;

/**
 * The task service's internal state — a simple in-memory array.
 *
 * Lecture 08's point: storage is the application's responsibility. The server
 * only exposes the Tasks Resources and Tools that read/write this store.
 */
export type Task = {
  id: string;
  title: string;
  status: "open" | "done";
};

const tasks: Task[] = [
  { id: "fde-001", title: "Write MCP notes", status: "open" },
  { id: "fde-002", title: "Review pull request", status: "open" },
];

/**
 * TaskService: the application's CRUD layer for the task store.
 *
 * Chapter 02: Resources (task://backlog, task://summary) read from here.
 * Chapter 03: Tools (create_task, list_tasks, complete_task) mutate it.
 */
export function createTask(title: string): string {
  const id = `task-${Date.now()}`;
  tasks.push({ id, title, status: "open" });

  logger.info({ id, title }, "Task created");
  return `Task created: ${id} - ${title}`;
}

export function listTasks(): Task[] {
  return [...tasks];
}

export function completeTask(title: string): string {
  const task = tasks.find((t) => t.title === title);

  if (!task) {
    return `Task not found: ${title}`;
  }

  task.status = "done";

  logger.info({ title, task }, "Task completed");
  return `Task completed: ${title}`;
}

export function backlogText(): string {
  const open = tasks.filter((t) => t.status === "open");

  return `Backlog: ${open.length} open tasks\n` + open.map((t) => `- ${t.title}`).join("\n");
}

export function summaryText(): string {
  const total = tasks.length;
  const open = tasks.filter((t) => t.status === "open").length;
  const done = tasks.filter((t) => t.status === "done").length;

  return `Summary: ${total} total, ${open} open, ${done} done`;
}

export function projectText(projectId: string): string {
  const relevant = tasks.filter((t) => t.title.includes(projectId));

  return `Project: ${projectId}\nTasks: ${relevant.length}\n` + relevant.map((t) => `- ${t.title}`).join("\n");
}

export function profileText(userId: string): string {
  const open = tasks.filter((t) => t.status === "open").length;

  return `User: ${userId}\nOpen tasks: ${open}`;
}
