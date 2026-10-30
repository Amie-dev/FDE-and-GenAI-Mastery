# Chapter 05 — Prompts: Reusable Templates with Arguments

> **Goal of this chapter:** see the one file that registers Prompt templates, accepts
> arguments, and returns *messages* (not answers).

---

## 5.1 File details

| | |
|---|---|
| **Path** | `src/prompts/prompts.ts` |
| **Purpose** | register two Prompt templates — one with an argument, one without |
| **Imports** | `McpServer` from `@modelcontextprotocol/server`, `z` from `zod/v4` |
| **Exports** | `registerPrompts` (the single function that adds both Prompts) |
| **Depends on** | nothing in `src/` |
| **Implements** | Lecture 06 (Prompt = message template, not an answer), Lecture 07 §7.2 (argsSchema + `prompts/get`) |

---

## 5.2 Commands

Nothing to run on its own — it is imported by `server.ts` at process start. To check it type-checks:

```bash
npm run typecheck
```

---

## 5.3 Full file

**Path:** `src/prompts/prompts.ts`

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

/**
 * Chapter 06/07 — Prompts: reusable interaction templates, controlled by the USER.
 *
 * A Prompt is a *message template*, not an answer. `prompts/get` returns the
 * messages to send to the model with the arguments substituted in, and nothing
 * in this file calls a model — that is Chapter 07 §7.3.
 *
 * Note what the templates *say*: they tell the model which Resources to read
 * and which Tools exist. That is how a Prompt cooperates with the other two
 * primitives (Chapter 07 §7.2) without the Prompt knowing anything about them.
 */
export function registerPrompts(server: McpServer): void {
  /* ── with an argument — the template is useless until the user supplies one ── */

  server.registerPrompt(
    "plan_day",
    {
      title: "Plan my day",
      description:
        "Build an ordered plan for the tasks already on the backlog, using the hours the user has available.",
      argsSchema: z.object({
        availableHours: z.string().describe("Number of hours available today, e.g. 4"),
      }),
    },
    ({ availableHours }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Help me plan my pending tasks for today.

First read my current pending tasks using the available task tools.

I have ${availableHours} hours available today.

Give me a concise and ordered plan.`,
          },
        },
      ],
    }),
  );

  /* ── without an argument — a Prompt is not required to take any ─────────── */

  server.registerPrompt(
    "review_workload",
    {
      title: "Review my workload",
      description: "Look at the current backlog and say whether it is realistic, and what to drop first.",
    },
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Review my current workload.

Read my open tasks, then tell me:
1. whether the total is realistic, and
2. which tasks I should drop or defer first, and why.`,
          },
        },
      ],
    }),
  );
}
```

---

## 5.4 Block-by-block explanation

### Block 1 — the import tower

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
```

- `type McpServer` — a type‑only import, erased at compile time (no runtime cost).
- `z` is **Zod v4** — the schema library the MCP SDK uses to declare argument contracts.
  `z.object({ availableHours: z.string()… })` is the `argsSchema` Lecture 07 §7.2 describes.

### Block 2 — `plan_day`: the argumentised Prompt

```ts
server.registerPrompt(
  "plan_day",
  {
    title: "Plan my day",
    description: "Build an ordered plan for the tasks already on the backlog, using the hours the user has available.",
    argsSchema: z.object({
      availableHours: z.string().describe("Number of hours available today, e.g. 4"),
    }),
  },
  ({ availableHours }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Help me plan my pending tasks for today.

First read my current pending tasks using the available task tools.

I have ${availableHours} hours available today.

Give me a concise and ordered plan.`,
        },
      },
    ],
  }),
);
```

Three arguments to `registerPrompt`:

| Argument | Role | Lecture concept |
|---|---|---|
| `"plan_day"` | the Prompt's `name` | Lecture 06 §6.3 — identified by `name` |
| `{ title, description, argsSchema }` | metadata + argument contract | Lecture 06 §6.7 — arguments beat name variants |
| `({ availableHours }) => ({ messages: [...] })` | the **pure function** | `prompts/get` calls this; zero tokens, fully deterministic |

- `role: "user"` — this is a **user** message, not an assistant message or a system message.
- `content.type === "text"` — a text content block, the shape the model receives.
- `${availableHours}` — the argument is **substituted into the template string** and becomes
  part of the message text. That is the whole point: one Definition, many messages.
- **Crucially**, this function does **not** call a model. Lecture 06 §6.5: `MCP Prompt ≠ LLM
  Response`. This file returns *messages*; the model produces the *answer*.

### Block 3 — `review_workload`: the argumentless Prompt

```ts
server.registerPrompt(
  "review_workload",
  {
    title: "Review my workload",
    description: "Look at the current backlog and say whether it is realistic, and what to drop first.",
  },
  () => ({
    messages: [...],
  }),
);
```

- No `argsSchema` — the Prompt takes no arguments. That is legal; Lecture 06 §6.7 says a
  Parameterised Prompt is *one* option, not a requirement.
- The handler takes nothing and returns a fixed message. Same shape, simpler contract.

---

## 5.5 Run / verify

```bash
npm run typecheck    # silent, exit 0
```

At runtime, `prompts/list` returns both Prompts. `prompts/get name=plan_day arguments=availableHours:"4"`
returns:

```text
Help me plan my pending tasks for today.

First read my current pending tasks using the available task tools.

I have 4 hours available today.

Give me a concise and ordered plan.
```

---

## 5.6 Checkpoint

1. **What does `registerPrompt` return?** → nothing. It *registers* a template with the server;
   the function is only *called* when a client invokes `prompts/get`.
2. **Why is `({ availableHours }) =>` a pure function?** → it takes arguments and produces
   messages deterministically — no I/O, no model call, no side effects. That is what makes
   it unit-testable (Lecture 07 §7.5).
3. **What makes `plan_day` a "user-controlled" primitive?** → the user chooses to invoke it
   (via a button, slash command, or `GET /prompt?name=plan_day&hours=4`). The model does not
   decide *when* to call it.
4. **One `plan_day(availableHours)` or many `plan_day_4_hours`, `plan_day_8_hours`?** → one
   parameterised Prompt. Names with baked‑in values grow the menu without bound.

**Next:** [Chapter 06 — Tools & Server Assembly](./06_Tools_and_Server_Assembly.md)