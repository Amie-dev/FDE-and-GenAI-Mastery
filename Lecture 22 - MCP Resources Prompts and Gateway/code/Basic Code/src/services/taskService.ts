/**
 * Chapter 04 — the data layer.
 *
 * The server keeps tasks in an array because the lecture is about the *protocol*,
 * not persistence. Everything below is a pure function of that array, so the
 * Resource and Tool handlers can share the same text views without agreeing
 * about who owns them.
 */

export type Task = {
  title: string;
  priority: "high" | "medium" | "low";
  project: string;
  status: "open" | "done";
};

export const guidelines = `Task Management Guidelines:

1. Deep work tasks should preferably be done before 12 PM.
2. Meetings should preferably be scheduled after 2 PM.
3. Urgent tasks should be completed on the same day.
4. Keep a maximum of three high-priority tasks per day.
5. Complete high-priority tasks before low-priority tasks.`;

const tasks: Task[] = [
  { title: "Write MCP notes", priority: "high", project: "fde", status: "open" },
  { title: "Review pull request", priority: "high", project: "fde", status: "open" },
  { title: "Plan the sprint", priority: "medium", project: "media", status: "open" },
  { title: "Update README", priority: "low", project: "fde", status: "done" },
];

export function createTask(title: string): string {
  tasks.push({ title, priority: "medium", project: "general", status: "open" });

  return `Task created: ${title}`;
}

export function completeTask(title: string): string {
  const task = tasks.find((t) => t.title === title);

  if (!task) {
    throw new Error(`No task with title '${title}'`);
  }

  task.status = "done";

  return `Task completed: ${title}`;
}

export function backlogText(): string {
  const open = tasks.filter((t) => t.status === "open");

  if (open.length === 0) {
    return "No open tasks.";
  }

  return open.map((t) => `- [${t.priority}] ${t.title} (${t.project})`).join("\n");
}

export function summaryText(): string {
  const open = tasks.filter((t) => t.status === "open");
  const byPriority = {
    high: open.filter((t) => t.priority === "high").length,
    medium: open.filter((t) => t.priority === "medium").length,
    low: open.filter((t) => t.priority === "low").length,
  };

  const projects = [...new Set(open.map((t) => t.project))];

  return `Open tasks: ${open.length}
By priority: ${byPriority.high} high, ${byPriority.medium} medium, ${byPriority.low} low
Projects: ${projects.join(", ") || "none"}`;
}

export function projectText(projectId: string): string {
  const projectTasks = tasks.filter((t) => t.project === projectId);

  if (projectTasks.length === 0) {
    return `No tasks found for project '${projectId}'.`;
  }

  return `Project: ${projectId}
Tasks: ${projectTasks.length}
${projectTasks.map((t) => `- [${t.status}] [${t.priority}] ${t.title}`).join("\n")}`;
}

export function profileText(userId: string): string {
  const open = tasks.filter((t) => t.status === "open");

  return `User: ${userId}
Open tasks: ${open.length} of ${tasks.length}
${open.slice(0, 3).map((t) => `- [${t.priority}] ${t.title}`).join("\n")}`;
}