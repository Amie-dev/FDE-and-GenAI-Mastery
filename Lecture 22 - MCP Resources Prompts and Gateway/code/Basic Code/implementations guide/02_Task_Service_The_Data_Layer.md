# Chapter 02 — Task Service: The Data Layer

> **Goal of this chapter:** see the one file that every primitive reads or writes — the
> shared task data and the text views that Tools and Resources both produce.

---

## 2.1 File details

| | |
|---|---|
| **Path** | `src/services/taskService.ts` |
| **Purpose** | the data every primitive reads or writes — tasks array plus pure functions that render it as text |
| **Imports** | none (pure TypeScript) |
| **Exports** | `guidelines`, `createTask`, `completeTask`, `backlogText`, `summaryText`, `projectText`, `profileText` |
| **Depends on** | nothing in `src/` |
| **Implements** | Lecture 04 (static/dynamic/templated Resources all call these functions), Lecture 02 (`list_tasks` Tool vs `task://backlog` Resource both call `backlogText()`) |

---

## 2.2 Commands

Nothing to run on its own — it is imported by everything else. To check it type-checks:

```bash
npm run typecheck
```

---

## 2.3 Full file

**Path:** `src/services/taskService.ts`

```ts
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
```

---

## 2.4 Block-by-block explanation

### Block 1 — the `Task` type

```ts
export type Task = {
  title: string;
  priority: "high" | "medium" | "low";
  project: string;
  status: "open" | "done";
};
```

- The only schema in the whole project. One type for tasks, used by `createTask`,
  `completeTask`, `backlogText`, `summaryText`, `projectText` and `profileText`.
- `priority` and `status` are union types, not plain strings — so the code cannot
  accidentally emit `"HIGH"` or `"completed"` and break the text views.

### Block 2 — `guidelines` — the static Resource content

```ts
export const guidelines = `Task Management Guidelines:

1. Deep work tasks should preferably be done before 12 PM.
2. Meetings should preferably be scheduled after 2 PM.
3. Urgent tasks should be completed on the same day.
4. Keep a maximum of three high-priority tasks per day.
5. Complete high-priority tasks before low-priority tasks.`;
```

- This is the **static Resource** content — `task://guidelines` returns exactly this
  string, every time. It lives in `taskService` because it is *content*, not *logic*.
- A `registerResource()` handler in `resources.ts` simply returns this string as
  `contents[0].text` — nothing more.

### Block 3 — the task array

```ts
const tasks: Task[] = [
  { title: "Write MCP notes", priority: "high", project: "fde", status: "open" },
  { title: "Review pull request", priority: "high", project: "fde", status: "open" },
  { title: "Plan the sprint", priority: "medium", project: "media", status: "open" },
  { title: "Update README", priority: "low", project: "fde", status: "done" },
];
```

- This is the whole "database." A real server would call Postgres or a file here; the
  lecture keeps an array because the point is the protocol, not persistence.
- `tasks` is module-private: nothing outside this file can mutate it directly. The only
  write paths are `createTask()` and `completeTask()` — that is Lecture 02's "read-only"
  contract for Resources, even though Tools *can* write.

### Block 4 — `createTask` — the Tool that mutates state

```ts
export function createTask(title: string): string {
  tasks.push({ title, priority: "medium", project: "general", status: "open" });

  return `Task created: ${title}`;
}
```

- A Tool has side effects: it *changes* the array. `create_task` is registered as a Tool
  precisely because the model decides when to call it and because it mutates state.
- It returns a plain confirmation string — the Tool result is small, just like MCP Tools
  should be.

### Block 5 — `completeTask` — mutate by identity

```ts
export function completeTask(title: string): string {
  const task = tasks.find((t) => t.title === title);

  if (!task) {
    throw new Error(`No task with title '${title}'`);
  }

  task.status = "done";

  return `Task completed: ${title}`;
}
```

- Throws loudly on not-found — Lecture 04 §4.10 says never return `{}` on missing;
  an empty object is indistinguishable from a real empty profile.
- Returns a confirmation string. The Tool framework wraps this into `content[0].text`.

### Block 6 — `backlogText` — the dynamic view

```ts
export function backlogText(): string {
  const open = tasks.filter((t) => t.status === "open");

  if (open.length === 0) {
    return "No open tasks.";
  }

  return open.map((t) => `- [${t.priority}] ${t.title} (${t.project})`).join("\n");
}
```

- `task://backlog` and the `list_tasks` Tool both call `backlogText()` — Lecture 02's
  central point: same payload, different owner. The model decides to call the Tool;
  the application decides to read the Resource.
- Every call recomputes from `tasks`, so this is the **dynamic** view — content changes
  between reads, cached only briefly if at all.

### Block 7 — `summaryText` — a second dynamic Resource view

```ts
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
```

- A third dynamic Resource: `task://summary` gives counts instead of the full list.
- Shows that dynamic Resources can render *derived* data — not just raw rows.

### Block 8 — `projectText` — a templated Resource view

```ts
export function projectText(projectId: string): string {
  const projectTasks = tasks.filter((t) => t.project === projectId);

  if (projectTasks.length === 0) {
    return `No tasks found for project '${projectId}'.`;
  }

  return `Project: ${projectId}
Tasks: ${projectTasks.length}
${projectTasks.map((t) => `- [${t.status}] [${t.priority}] ${t.title}`).join("\n")}`;
}
```

- Takes `projectId` — that is the parameter the Resource template
  `task://projects/{projectId}` substitutes into the URI before calling this function.
- Returns `No tasks found…` when empty — thrown as an error would be louder, but here
  we return text. In production, Chapter 04 §4.10 says throw on not-found; this is the
  demo happy path.

### Block 9 — `profileText` — the second templated Resource view

```ts
export function profileText(userId: string): string {
  const open = tasks.filter((t) => t.status === "open");

  return `User: ${userId}
Open tasks: ${open.length} of ${tasks.length}
${open.slice(0, 3).map((t) => `- [${t.priority}] ${t.title}`).join("\n")}`;
}
```

- Takes `userId` — substituted from `user://{userId}/profile`.
- Shows the second templated Resource family.

---

## 2.5 Run / verify

```bash
npm run typecheck    # silent, exit 0
```

This file has no runtime entry point — it is loaded by `resources.ts` and `client.ts`.

---

## 2.6 Checkpoint

1. **Why does `list_tasks` and `task://backlog` both call `backlogText()`?** → Lecture 02:
   same payload, different owner. The model calls the Tool; the application reads the Resource.
2. **Why is `tasks` module-private?** → the only writes are through `createTask` and
   `completeTask`, so every mutation passes through a single audit point.
3. **What does `completeTask` do when the title is missing?** → throws an error, never
   returns `{}` — Lecture 04 §4.10.
4. **What makes `projectText` templated?** → it takes `projectId` as an argument, exactly
   the parameter a URI template substitutes.

**Next:** [Chapter 03 — Resources: Static, Dynamic, Templated](./03_Resources_Static_Dynamic_and_Templated.md)