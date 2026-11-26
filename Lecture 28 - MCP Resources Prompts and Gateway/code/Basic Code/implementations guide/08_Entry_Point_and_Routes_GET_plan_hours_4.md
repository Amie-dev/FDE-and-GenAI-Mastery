# Chapter 08 — Entry Point & Routes: `GET /plan?hours=4`

> **Goal of this chapter:** see the two process files that host the server and the
> application, and how `GET /plan?hours=4` runs the three primitives end‑to‑end.

---

## 8.1 File details

| | |
|---|---|
| **Paths** | `src/index.ts`, `src/routes/index.ts` |
| **Purpose** | `src/index.ts` — the MCP server process (Streamable HTTP, :8081). `src/routes/index.ts` — the HTTP host (Express, :8080). |
| **Imports** | MCP SDK Express adapter, Express |
| **Exports** | neither (both are entry‑point processes) |
| **Depends on** | `src/server/server.ts` (index.ts), `src/client/client.ts` (routes/index.ts) |
| **Implements** | Lecture 01 (transport binding), Lecture 09 (gateway boundary / route‑level control), Lecture 08 (end‑to‑end `GET /plan?hours=4`) |

---

## 8.2 Commands

Two terminals:

```bash
# terminal 1
npm run server     # MCP server, http://127.0.0.1:8081/mcp

# terminal 2
npm run host       # HTTP host, http://127.0.0.1:8080
```

Or one command:

```bash
npm run lifecycle  # walks the whole flow inside the client
```

---

## 8.3 Full file: `src/index.ts`

**Path:** `src/index.ts`

```ts
#!/usr/bin/env node
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { mcpPort, serverInfo } from "./config/config.js";
import { createServer as createMcpServer } from "./server/server.js";

/**
 * Chapter 01 — the transport binding.
 *
 * Streamable HTTP: the host reaches this process at `POST /mcp`. The server
 * itself (`src/server/server.ts`) knows nothing about it, so swapping this file
 * is the only change a different binding would need.
 *
 * Express is the binding, and `createMcpExpressApp` is why that costs four lines
 * instead of forty. Chapter 09's security point is still enforced — DNS-rebinding
 * (`Host`) and foreign-origin (`Origin`) validation both apply — but it is now
 * enforced *by the adapter*, because the app is bound to a localhost address and
 * the adapter turns those checks on automatically. That is not a downgrade: a
 * server bound to localhost is still reachable from any web page in the user's
 * browser, so the protection has to be impossible to forget.
 */
const handler = createMcpHandler(createMcpServer);
const nodeHandler = toNodeHandler(handler);

const app = createMcpExpressApp({ host: "127.0.0.1" });

/**
 * Express advertises itself with `X-Powered-By: Express` unless told not to.
 */
app.disable("x-powered-by");

/**
 * `request.body` is passed explicitly, and it is not optional.
 *
 * `createMcpExpressApp` installs `express.json()`, which consumes the request
 * stream to populate `request.body`. `toNodeHandler` would otherwise try to read
 * that same stream and find it already drained — so the third argument is how the
 * parsed body is handed across.
 */
app.all("/mcp", (request, response) => {
  void nodeHandler(request, response, request.body);
});

const httpServer = app.listen(mcpPort, "127.0.0.1", () => {
  console.error(
    `[${serverInfo.name}] v${serverInfo.version} MCP endpoint on http://127.0.0.1:${mcpPort}/mcp`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void handler.close();
    httpServer.close();
  });
}
```

---

## 8.3 Block-by-block explanation (index.ts)

### Block 1 — create the handler

```ts
const handler = createMcpHandler(createMcpServer);
const nodeHandler = toNodeHandler(handler);
```

- `createMcpServer` is our `createServer()` from `server.ts` — the MCP Server factory
  that registers Tools, Resources, and Prompts.
- `createMcpHandler` adapts the SDK into an Express‑compatible handler.
- `toNodeHandler` converts that into a plain `(req, res, body)` callback.

### Block 2 — mount on Express at `/mcp`

```ts
const app = createMcpExpressApp({ host: "127.0.0.1" });
app.disable("x-powered-by");
app.all("/mcp", (request, response) => {
  void nodeHandler(request, response, request.body);
});
```

- `createMcpExpressApp({ host: "127.0.0.1" })` binds to localhost only — Chapter 09's
  security point: a localhost‑bound server is still reachable from the user's browser,
  so DNS‑rebinding / origin validation is enforced by the adapter automatically.
- `app.disable("x-powered-by")` keeps the response surface small — a server that answers
  strangers should not volunteer its stack.
- `app.all("/mcp", …)` — one route, any method, passes the parsed `request.body` to the
  handler because `createMcpExpressApp` already installed `express.json()`.

### Block 3 — listen

```ts
const httpServer = app.listen(mcpPort, "127.0.0.1", () => {
  console.error(`[${serverInfo.name}] v${serverInfo.version} MCP endpoint on http://127.0.0.1:${mcpPort}/mcp`);
});
```

- Binds to `127.0.0.1:8081`. `mcpPort` is read from `config.ts` (default 8081).

### Block 4 — graceful shutdown

```ts
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void handler.close();
    httpServer.close();
  });
}
```

- On `Ctrl+C` or `kill`, close the handler (gracefully terminates MCP sessions) then the
  HTTP server.

---

## 8.4 Full file: `src/routes/index.ts`

**Path:** `src/routes/index.ts`

```ts
/**
 * Chapter 09 — the HOST: the HTTP application a user actually talks to.
 *
 * `GET /plan?hours=4` is the request the lecture runs end to end. Watch the
 * division of labour in it: the USER chose the workflow (the Prompt), the
 * APPLICATION chose the context (the Resources), and the MODEL chooses any tool
 * call. Three primitives, three owners, one request.
 *
 * The host is plain Express: one route table, one 404 catch‑all, one error
 * handler. Everything protocol‑shaped stays behind `../client/client.js` —
 * this file speaks HTTP and nothing else.
 */
import express, { type Express, type NextFunction, type Request, type Response } from "express";

import { hostPort } from "../config/config.js";
import {
  ask,
  connect,
  disconnect,
  getPromptText,
  listPrompts,
  listResources,
  planDay,
  readResource,
} from "../client/client.js";

// One client, opened once, for the whole life of the host.
const connection = await connect();
const { client } = connection;

/**
 * `req.query` values are `string | string[] | ParsedQs`, and every route below
 * wants a single string — or nothing. This narrows the type in one place, so a
 * missing (or repeated) parameter becomes `undefined` and the `??` defaults
 * turn it into a sensible value. **No route can crash on a bad query string.**
 */
function query(request: Request, key: string): string | undefined {
  const value = request.query[key];

  return typeof value === "string" ? value : undefined;
}

/**
 * The route table. Each entry is one endpoint; the key is the pathname and the
 * value is a function that turns a request into text. `req.query` is Express's
 * parsed query string, which is how `hours` reaches the Prompt argument.
 */
const routes: Record<string, (request: Request) => Promise<string>> = {
  /* Chapter 03 — discovery of everything the server offers. */
  "/resources": async () => {
    const { resources, resourceTemplates } = await listResources(client);

    return [
      ...resources.map((resource) => `${resource.uri}\n    ${resource.description ?? ""}`),
      ...resourceTemplates
        .map((template) => `${template.uriTemplate}   (template)`)
        .join("\n"),
    ].join("\n");
  },

  /* Chapter 03 — consumption: read one Resource by URI. */
  "/read": async (request) => readResource(client, query(request, "uri") ?? "task://guidelines"),

  /* Chapter 06 — what workflows does the server offer? */
  "/prompts": async () =>
    (await listPrompts(client))
      .map((prompt) => `${prompt.name}   ${prompt.description ?? ""}`)
      .join("\n"),

  /* Chapter 07 §7.3 — fetch the Prompt. No model is called by this route. */
  "/prompt": async (request) =>
    getPromptText(client, query(request, "name") ?? "plan_day", {
      availableHours: query(request, "hours") ?? "4",
    }),

  /* Chapter 05 — the application selects context, then the model answers. */
  "/ask": async (request) => {
    const message = query(request, "message");

    if (!message) {
      throw new Error("Query parameter 'message' is required.");
    }

    return ask(client, message);
  },

  /* Chapter 08 — the lecture's end-to-end request: Prompt → (Resources + Tools) → answer. */
  "/plan": async (request) => planDay(client, query(request, "hours") ?? "4"),
};

const app: Express = express();

// The raw Node host sent no `X-Powered-By` header; disabling it keeps the
// response surface identical after the swap to Express.
app.disable("x-powered-by");

/**
 * Register the table. Every handler returns text or throws: Express 5 forwards
 * a rejected promise straight to the error handler below, so no route needs a
 * `try`/`catch` of its own.
 */
for (const [path, handler] of Object.entries(routes)) {
  app.get(path, async (request, response) => {
    response.type("text/plain").send(await handler(request));
  });
}

/** The 404 lists the routes, so a wrong URL tells you the right ones. */
app.use((_request, response) => {
  response.status(404).type("text/plain").send(`Not found. Try one of:\n${Object.keys(routes).join("\n")}`);
});

/** The only other status this host has: 500, with the message as the body. */
app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  response.status(500).type("text/plain").send(error.message);
});

const httpServer = app.listen(hostPort, "127.0.0.1", () => {
  console.error(`Task host is running at http://127.0.0.1:${hostPort}`);
  console.error(`Try: http://127.0.0.1:${hostPort}/plan?hours=4`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void disconnect(connection);
    httpServer.close();
  });
}
```

---

## 8.5 Block-by-block explanation (routes/index.ts)

### Block 1 — one client, opened once

```ts
const connection = await connect();
const { client } = connection;
```

- Top‑level `await` (possible because `module: NodeNext` in `tsconfig.json`). One
  `StreamableHTTPClientTransport` stays open for the life of the host process.
- Every route shares the same client — the connection is not per‑request.

### Block 2 — the `query` helper

```ts
function query(request: Request, key: string): string | undefined {
  const value = request.query[key];
  return typeof value === "string" ? value : undefined;
}
```

- Express parses query strings into `string | string[] | ParsedQs`. This narrows to a
  single `string | undefined`. Missing or repeated parameters become `undefined`; the
  `??` defaults in each route turn them into sensible values. No route can crash on a
  bad query string.

### Block 3 — the route table

| Route | Lecture | What it does |
|---|---|---|
| `GET /resources` | 03 | `resources/list` output — all concrete URIs + templates |
| `GET /read?uri=…` | 03 | `resources/read` for one URI |
| `GET /prompts` | 06 | `prompts/list` — every workflow |
| `GET /prompt?name=…&hours=…` | 07 §7.3 | `prompts/get` — returns text, no model call |
| `GET /ask?message=…` | 05 | application reads Resources, then model answers |
| `GET /plan?hours=…` | 08 | end‑to‑end: Prompt → Resources + Tools → answer |

- `GET /plan?hours=4` calls `planDay(client, "4")` — `getPromptText` (MCP) then
  `askModel` (model). That is Lecture 08's three‑actor flow.
- `GET /prompt?name=plan_day&hours=4` calls `getPromptText` only — no model involved.

### Block 4 — route registration

```ts
for (const [path, handler] of Object.entries(routes)) {
  app.get(path, async (request, response) => {
    response.type("text/plain").send(await handler(request));
  });
}
```

- One loop registers all six routes. Every handler returns text (or throws); Express 5
  forwards rejected promises to the error handler below, so no route needs its own
  `try`/`catch`.

### Block 5 — 404 and 500

```ts
app.use((_request, response) => {
  response.status(404).type("text/plain").send(`Not found. Try one of:\n${Object.keys(routes).join("\n")}`);
});

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  response.status(500).type("text/plain").send(error.message);
});
```

- 404 lists every available route, so a wrong URL is self‑correcting.
- 500 returns the error message as the body — no stack traces leaked to the client.

---

## 8.6 Run / verify

Terminal 1:

```bash
npm run server
# → [task-mcp-server] v1.0.0 MCP endpoint on http://127.0.0.1:8081/mcp
```

Terminal 2:

```bash
npm run host
# → Task host is running at http://127.0.0.1:8080
# → Try: http://127.0.0.1:8080/plan?hours=4
```

Then:

```bash
curl 'http://127.0.0.1:8080/resources'                      # discovery
curl 'http://127.0.0.1:8080/prompts'                        # the prompt menu
curl 'http://127.0.0.1:8080/read?uri=task://summary'        # consumption
curl 'http://127.0.0.1:8080/prompt?name=plan_day&hours=8'   # the QUESTION (no model)
curl 'http://127.0.0.1:8080/plan?hours=4'                   # the ANSWER
curl 'http://127.0.0.1:8080/ask?message=what%20is%20on%20my%20plate'
```

---

## 8.7 Checkpoint

1. **Why does `index.ts` only bind to `127.0.0.1`?** → Chapter 09 security: the adapter enforces
   origin/DNS‑rebinding validation, and localhost binding keeps the server off public
   interfaces by default.
2. **Why does `routes/index.ts` open one client at module level?** → the connection is shared
   across all routes; opening per‑request would add latency and exceed the server's session
   budget.
3. **What does `GET /prompt?name=plan_day&hours=4` do that `GET /plan?hours=4` does not?** →
   `/prompt` only does `getPromptText` (MCP, no model). `/plan` does `getPromptText` *then*
   `askModel` (MCP + model). That is Lecture 07 §7.3's split: MCP call and LLM call are
   different lines of code.
4. **Why does the 404 handler list all routes?** → discoverability without docs — `GET /`
   tells you exactly what `GET /plan?hours=4` needs.

**Next:** [Back to README](./README.md) · [Back to Basic Code README](../README.md) · [Back to Lecture 22 notes](../../notes/README.md)