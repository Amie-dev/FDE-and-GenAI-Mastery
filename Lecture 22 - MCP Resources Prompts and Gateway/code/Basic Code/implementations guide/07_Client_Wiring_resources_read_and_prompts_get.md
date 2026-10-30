# Chapter 07 — Client Wiring: `resources/read` & `prompts/get`

> **Goal of this chapter:** see the file that connects to the MCP server, discovers
> Resources, reads one, fetches a Prompt, and keeps the two halves (MCP vs. model)
> in separate functions.

---

## 7.1 File details

| | |
|---|---|
| **Path** | `src/client/client.ts` |
| **Purpose** | MCP client wrappers (one per verb) + the lifecycle walkthrough `main()` |
| **Imports** | `spawn` / `pathToFileURL` (Node built‑ins), `Client` + `StreamableHTTPClientTransport` from `@modelcontextprotocol/client`, config, resource selector |
| **Exports** | `connect`, `disconnect`, `listResources`, `readResource`, `listPrompts`, `getPromptText`, `askModel`, `ask`, `planDay`, `Connection` |
| **Depends on** | `src/config/config.ts`, `src/services/resourceSelector.ts`, `src/services/taskService.ts` |
| **Implements** | Lecture 03 (`resources/list` vs `resources/read`), Lecture 06 (`prompts/list` / `prompts/get`), Lecture 07 §7.3 (`getPromptText` vs `askModel`), Lecture 08 (end‑to‑end) |

---

## 7.2 Commands

```bash
npm run lifecycle     # starts the server, walks the lifecycle, prints steps 1–7
```

---

## 7.3 Full file

**Path:** `src/client/client.ts`

```ts
/**
 * Chapter 08 — the CLIENT: everything the application does with the server.
 *
 * The wrappers below are deliberately one function per MCP verb, so the
 * difference between reading a Resource and fetching a Prompt is visible on the
 * page. `main()` then walks the whole lifecycle in order — and starts the
 * server itself, which is what a real host does.
 */
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

import { mcpServerUrl, hasModelKey, model } from "../config/config.js";
import { selectResources } from "../services/resourceSelector.js";

export type Connection = {
  client: Client;
  transport: StreamableHTTPClientTransport;
};

/** Chapter 08 — step 1 of every host: open one client to one server. */
export async function connect(): Promise<Connection> {
  const client = new Client({ name: "task-host", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl));

  await client.connect(transport);

  return { client, transport };
}

export async function disconnect(connection: Connection): Promise<void> {
  try {
    await connection.transport.terminateSession();
  } catch {
    // No session was established, so there is nothing to terminate.
  }

  await connection.client.close();
}

/* ── Chapter 03 — discovery: what context exists? ─────────────────────────── */

export async function listResources(client: Client) {
  const { resources } = await client.listResources();
  const { resourceTemplates } = await client.listResourceTemplates();

  return { resources, resourceTemplates };
}

/** Chapter 03 — consumption: discovery is not reading. */
export async function readResource(client: Client, uri: string): Promise<string> {
  const result = await client.readResource({ uri });

  return result.contents
    .map((content) => ("text" in content ? content.text : `[${content.mimeType ?? "binary"} content]`))
    .join("\n");
}

/* ── Chapter 06/07 — prompts: what workflows does the server offer? ───────── */

export async function listPrompts(client: Client) {
  const { prompts } = await client.listPrompts();

  return prompts;
}

/**
 * Chapter 07 §7.3 — this returns TEXT, not an answer.
 * `prompts/get` is a server call; the model call happens afterwards.
 */
export async function getPromptText(
  client: Client,
  name: string,
  args: Record<string, string>,
): Promise<string> {
  const result = await client.getPrompt({ name, arguments: args });

  return result.messages
    .map((message) => (message.content.type === "text" ? message.content.text : ""))
    .join("\n");
}

/* ── Chapter 07 §7.3 — the one place a model is involved ───────────────────── */

export async function askModel(message: string, instructions?: string): Promise<string> {
  if (!hasModelKey) {
    // Offline mode: print what would have been sent, so the Resource and Prompt
    // half of the protocol stays visible without an API key.
    return [
      "(offline — no OPENAI_API_KEY, so no model was called)",
      "",
      instructions ? `SYSTEM:\n${instructions}` : "",
      `USER:\n${message}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI();
  const response = await openai.responses.create({ model, instructions, input: message });

  return response.output_text;
}

/**
 * Chapter 05/07 — the Resource flow.
 * The APPLICATION chooses the context, then the model answers.
 */
export async function ask(client: Client, message: string): Promise<string> {
  const { resources } = await listResources(client);
  const catalogue = resources.map((resource) => ({
    uri: resource.uri,
    description: resource.description ?? "",
  }));

  const context: string[] = [];

  for (const choice of selectResources(message, catalogue)) {
    const text = await readResource(client, choice.uri);
    context.push(`--- ${choice.uri} (chosen by ${choice.strategy}) ---\n${text}`);
  }

  const instructions = [
    "You are a task management assistant.",
    "Use the context below whenever it is relevant to the question.",
    context.join("\n\n"),
  ].join("\n\n");

  return askModel(message, instructions);
}

/**
 * Chapter 07/08 — the Prompt flow.
 * The USER chooses the workflow, then the model runs it. One line of protocol,
 * one line of model — and they are not the same line.
 */
export async function planDay(client: Client, hours: string): Promise<string> {
  const prompt = await getPromptText(client, "plan_day", { availableHours: hours });

  return askModel(prompt);
}

/* ── the walkthrough: `npm run lifecycle` ─────────────────────────────────── */

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => `   ${line}`)
    .join("\n");
}

async function isServerRunning(): Promise<boolean> {
  try {
    await disconnect(await connect());
    return true;
  } catch {
    return false;
  }
}

async function connectWithRetry(): Promise<Connection> {
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    try {
      return await connect();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`Could not reach the MCP server at ${mcpServerUrl}. Start it with: npm run server`);
}

async function main(): Promise<void> {
  // Chapter 08 — a host owns the lifecycle: it starts the server, then talks to it.
  // `detached: true` puts the server in its own process group so the whole
  // `npx → tsx → node` chain can be stopped with one signal below.
  const server = (await isServerRunning())
    ? undefined
    : spawn("npx", ["tsx", "src/index.ts"], { stdio: "inherit", detached: true });

  const connection = await connectWithRetry();
  const { client } = connection;

  try {
    console.log("\n1. resources/list — discovery, not consumption");
    const { resources, resourceTemplates } = await listResources(client);
    for (const resource of resources) {
      console.log(`   ${resource.uri}`);
    }
    for (const template of resourceTemplates) {
      console.log(`   ${template.uriTemplate}   (template)`);
    }

    console.log("\n2. resources/read task://guidelines — a STATIC Resource");
    console.log(indent(await readResource(client, "task://guidelines")));

    console.log("\n3. resources/read task://projects/fde — a TEMPLATED Resource, one definition");
    console.log(indent(await readResource(client, "task://projects/fde")));

    console.log("\n4. resources/read user://123/profile — a second template, same shape");
    console.log(indent(await readResource(client, "user://123/profile")));

    console.log("\n5. prompts/list — which workflows exist?");
    for (const prompt of await listPrompts(client)) {
      const args = prompt.arguments?.map((argument) => argument.name).join(", ") ?? "";

      console.log(`   ${prompt.name}(${args})`);
    }

    console.log('\n6. prompts/get plan_day { availableHours: "4" } — a template, not an answer');
    console.log(indent(await getPromptText(client, "plan_day", { availableHours: "4" })));

    console.log("\n7. the model step, after prompts/get — GET /plan?hours=4 in miniature");
    console.log(indent(await planDay(client, "4")));
  } finally {
    await disconnect(connection);

    // One negative-pid signal stops the server's whole process group.
    if (server?.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        server.kill("SIGTERM");
      }
    }
  }
}

// Chapter 08 — run the walkthrough only when this file is executed directly.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
```

---

## 7.4 Block-by-block explanation

### Block 1 — the typesafe connection

```ts
export type Connection = {
  client: Client;
  transport: StreamableHTTPClientTransport;
};

export async function connect(): Promise<Connection> {
  const client = new Client({ name: "task-host", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl));
  await client.connect(transport);
  return { client, transport };
}
```

- Opens a **Streamable HTTP** transport to `mcpServerUrl` (`http://127.0.0.1:8081/mcp`).
- Returns both `client` and `transport` — the transport must be terminated on
  disconnect, so we bundle them in a `Connection` object.

### Block 2 — disconnect

```ts
export async function disconnect(connection: Connection): Promise<void> {
  try {
    await connection.transport.terminateSession();
  } catch {
    // No session was established, so there is nothing to terminate.
  }
  await connection.client.close();
}
```

- Calls `terminateSession()` (the transport-level teardown) and then `client.close()`
  (the object-level teardown). The try/catch is there because a server that died
  abruptly never negotiated a session.

### Block 3 — discovery (`listResources`)

```ts
export async function listResources(client: Client) {
  const { resources } = await client.listResources();
  const { resourceTemplates } = await client.listResourceTemplates();
  return { resources, resourceTemplates };
}
```

- Chapter 03 §3.10 takeaway #9: `resources/list` returns metadata; `resources/templates/list`
  returns parameterised patterns. We fetch **both** so the lifecycle output shows every shape.

### Block 4 — consumption (`readResource`)

```ts
export async function readResource(client: Client, uri: string): Promise<string> {
  const result = await client.readResource({ uri });
  return result.contents
    .map((content) => ("text" in content ? content.text : `[${content.mimeType ?? "binary"} content]`))
    .join("\n");
}
```

- Chapter 03 §3.8: `contents` is an **array**. `"text" in content` checks the shape —
  a `TextContent` has `.text`, a `BlobResourceContents` has `.blob`.
- `join("\n")` handles the multi‑block case gracefully, so one URI that returns multiple
  blocks still becomes a single string.

### Block 5 — prompt discovery (`listPrompts`)

```ts
export async function listPrompts(client: Client) {
  const { prompts } = await client.listPrompts();
  return prompts;
}
```

- Returns the prompt catalogue — each entry has a `name`, a `description`, and an
  `arguments` array that advertises required vs. optional parameters.

### Block 6 — prompt fetch (`getPromptText`)

```ts
export async function getPromptText(
  client: Client,
  name: string,
  args: Record<string, string>,
): Promise<string> {
  const result = await client.getPrompt({ name, arguments: args });
  return result.messages
    .map((message) => (message.content.type === "text" ? message.content.text : ""))
    .join("\n");
}
```

- **This returns TEXT, not an answer.** Chapter 07 §7.3 insists `prompts/get` and the LLM
  call are different lines of code. `getPromptText` does the MCP call; `askModel` (next block)
  does the LLM call.
- `result.messages` is an array — a Prompt may return multiple messages (Chapter 06 §6.10).
  `join("\\n")` concatenates them into one user message.

### Block 7 — the model call (`askModel`)

```ts
export async function askModel(message: string, instructions?: string): Promise<string> {
  if (!hasModelKey) {
    // Offline mode: print what would have been sent, so the Resource and Prompt
    // half of the protocol stays visible without an API key.
    return [
      "(offline — no OPENAI_API_KEY, so no model was called)",
      "",
      instructions ? `SYSTEM:\n${instructions}` : "",
      `USER:\n${message}`,
    ].filter(Boolean).join("\n");
  }

  const { default: OpenAI } = await import("openai");
  ...
}
```

- When `hasModelKey` is `false` — no `.env`, or `OPENAI_API_KEY=` is empty — **it prints** the
  system prompt and user message it *would* have sent. That is the lecture's "runs offline"
  guarantee: the Resource and Prompt half of the protocol is always demonstrable.
- When a key **is** present, it dynamically imports `openai` and calls the Responses API.

### Block 8 — the Resource flow (`ask`)

```ts
export async function ask(client: Client, message: string): Promise<string> {
  const { resources } = await listResources(client);
  const catalogue = resources.map((resource) => ({
    uri: resource.uri,
    description: resource.description ?? "",
  }));

  const context: string[] = [];
  for (const choice of selectResources(message, catalogue)) {
    const text = await readResource(client, choice.uri);
    context.push(`--- ${choice.uri} (chosen by ${choice.strategy}) ---\n${text}`);
  }
  ...
}
```

- Chapter 05: the application chooses the context. `selectResources` runs the four
  strategies (rules → retrieval → state → user override), returns the top‑3 matches,
  each tagged with a `strategy` so the log line records *why* it was read.

### Block 9 — the Prompt flow (`planDay`)

```ts
export async function planDay(client: Client, hours: string): Promise<string> {
  const prompt = await getPromptText(client, "plan_day", { availableHours: hours });
  return askModel(prompt);
}
```

- Chapter 07/08: one line of protocol (`getPromptText`), one line of model (`askModel`).
- They are **deliberately separated** — Lecture 07 §7.3: `prompts/get` talks to the MCP
  server; `askModel` talks to the LLM.

### Block 10 — the lifecycle walkthrough (`main`)

```
console.log("\n1. resources/list — discovery, not consumption");
console.log("\n2. resources/read task://guidelines — a STATIC Resource");
console.log("\n3. resources/read task://projects/fde — a TEMPLATED Resource, one definition");
console.log("\n4. resources/read user://123/profile — a second template, same shape");
console.log("\n5. prompts/list — which workflows exist?");
console.log('\n6. prompts/get plan_day { availableHours: "4" } — a template, not an answer');
console.log("\n7. the model step, after prompts/get — GET /plan?hours=4 in miniature");
```

- `main()` boots the server (if not already running), opens a client, walks the
  seven steps in lecture order, then tears down cleanly.

---

## 7.5 Run / verify

```bash
npm run lifecycle
```

Expected output (offline, no API key):

```text
[task-mcp-server] v1.0.0 MCP endpoint on http://127.0.0.1:8081/mcp

1. resources/list — discovery, not consumption
   task://guidelines
   task://backlog
   task://summary
   task://projects/{projectId}   (template)
   user://{userId}/profile   (template)

2. resources/read task://guidelines — a STATIC Resource
   Task Management Guidelines:
   1. Deep work tasks should preferably be done before 12 PM.
   ...

3. resources/read task://projects/fde — a TEMPLATED Resource, one definition
   Project: fde
   Tasks: 2
   - [open] Write MCP notes
   - [open] Review pull request

4. resources/read user://123/profile — a second template, same shape
   User: 123
   Open tasks: 2 of 2
   ...

5. prompts/list — which workflows exist?
   plan_day(availableHours)
   review_workload()

6. prompts/get plan_day { availableHours: "4" } — a template, not an answer
   Help me plan my pending tasks for today.
   First read my current pending tasks, then apply the task guidelines.
   I have 4 hours available today.
   ...

7. the model step, after prompts/get — GET /plan?hours=4 in miniature
   (offline — no OPENAI_API_KEY, so no model was called)
   USER:
   Help me plan my pending tasks for today.
   ...
```

---

## 7.6 Checkpoint

1. **What is the difference between `listResources` and `readResource`?** → discovery is
   metadata‑only and cheap; reading is expensive and deliberate. One lists URIs; the other
   returns `contents`.
2. **Why does `getPromptText` return text?** → because a Prompt is a message template
   (Lecture 06 §6.5). It does not call a model.
3. **Where is `askModel` called, and why is that important?** → in `planDay` and `ask`,
   *after* `getPromptText` / `readResource`. Keeping them separate proves Chapter 07 §7.3's
   point that the MCP server needs no model.
4. **What happens when `hasModelKey` is false?** → the client prints what it would have sent
   to the model instead, so the protocol half stays visible offline.
5. **Why does `planDay` split into two lines?** → one line is protocol (`getPromptText`),
   one line is model (`askModel`). Two systems, two credentials, two failure modes.

**Next:** [Chapter 08 — Entry Point & Routes: `GET /plan?hours=4`](./08_Entry_Point_and_Routes_GET_plan_hours_4.md)