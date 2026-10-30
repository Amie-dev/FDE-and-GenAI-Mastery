# Chapter 04: Host, Client and Server — The Three Roles

## Key Concepts

- **Host**: AI application owning UX, policy, consent, context, composition
- **MCP Client**: Talks the protocol to exactly one server — discovery, invocation, resources, prompts
- **MCP Server**: Provides capabilities (tools, resources, prompts); does the actual work; no LLM needed
- Same `createServer()` can be served over STDIO or Streamable HTTP — only the binding changes

## Code Relation

| Role | Code File | What It Does |
|------|-----------|-------------|
| **Host** | `src/index.ts` | Entry point, transport binding (stdio client spawns server) |
| **MCP Server** | `src/server/server.ts` | `createServer()` factory assembling tools, resources, prompts |
| **Business Logic** | `src/services/taskService.ts` | Execution layer for tools |
| **Configuration** | `src/config/config.ts` | Server identity, transport mode |

## Transport

- STDIO is the local binding (child process over stdin/stdout)
- The same `createServer()` would be served over HTTP by swapping only the transport line in `index.ts`
- STDIO rule: stdout is the protocol channel — diagnostics go to stderr

## Code Implementation

### `src/index.ts` — Host Entry Point and Transport Binding

```typescript
#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { serverInfo } from "./config/config.js";
import { createServer } from "./server/server.js";

/**
 * Chapter 04 — the transport binding.
 *
 * STDIO: the host spawns this file as a child process and the two exchange
 * JSON-RPC over stdin/stdout. The same `createServer()` factory would be served
 * over Streamable HTTP instead by swapping only this line.
 *
 * STDIO rule (Chapter 04): **stdout is the protocol channel**. Anything written
 * there that is not JSON-RPC corrupts the stream — so diagnostics go to stderr.
 */
serveStdio(createServer, {
  onerror: (error) => console.error(`[${serverInfo.name}] ${error.message}`),
});

console.error(`[${serverInfo.name}] v${serverInfo.version} listening on stdio`);
```

## Code Block Explanation

### `src/index.ts`

1. **`#!/usr/bin/env node`** — Makes this file directly executable with Node.js. Tells the OS to use Node to run this script.

2. **Three imports**:
   - `serveStdio` from `@modelcontextprotocol/server/stdio` — Binds the MCP server to STDIO transport. The host spawns this file as a child process; JSON-RPC messages flow through stdin/stdout.
   - `serverInfo` from `./config/config.js` — Server metadata (name, version) loaded from `.env`. Passed to `serveStdio` for error logging.
   - `createServer` from `./server/server.js` — The MCP server factory that registers all tools, resources, and prompts.

3. **`serveStdio(createServer, { onerror })`** — The core transport binding:
   - Takes the server factory and an error handler
   - Any error during server operation is logged with the server name via `console.error` (written to stderr, NOT stdout, to avoid corrupting the JSON-RPC protocol channel)
   - This is the STDIO entry point — the host process becomes the MCP client's server

4. **`console.error(...)`** — Logs when the server is ready. Note: uses `console.error` (stderr) rather than `console.log` (stdout) per the STDIO rule — writing non-JSON-RPC data to stdout would corrupt the protocol stream.

## Code Implementation: Server Factory

### `src/server/server.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/server";
import { serverInfo } from "../config/config.js";
import { registerPrompts } from "../prompts/prompts.js";
import { registerResources } from "../resources/resources.js";
import { registerTools } from "../tools/tools.js";

/**
 * Chapter 02 / Chapter 04 — assemble the capability provider.
 *
 * This is the "standard door": one server process exposing the three primitives,
 * with no knowledge of which host or which model is on the other side.
 */
export function createServer(): McpServer {
  const server = new McpServer(serverInfo);

  registerTools(server); // do    — driven by the model
  registerResources(server); // know  — driven by the application
  registerPrompts(server); // reuse — driven by the user

  return server;
}
```

## Code Block Explanation

### `src/server/server.ts`

1. **`import { McpServer } from "@modelcontextprotocol/server"`** — Core MCP server class. This is the capability provider.

2. **`import { serverInfo } from "../config/config.js"`** — Server identity imported from config.

3. **`import { registerPrompts } from "../prompts/prompts.js"`** — Imports the prompts registration function.

4. **`import { registerResources } from "../resources/resources.js"`** — Imports the resources registration function.

5. **`import { registerTools } from "../tools/tools.js"`** — Imports the tools registration function.

6. **`createServer()`** — The factory function:
   - `new McpServer(serverInfo)` creates a new MCP server instance with identity info
   - `registerTools(server)` registers "do" capabilities (tools the model can execute)
   - `registerResources(server)` registers "know" capabilities (addressable context/resources)
   - `registerPrompts(server)` registers "reuse" capabilities (user-controlled prompts)
   - **Key point**: The same `createServer()` works with either STDIO or HTTP transport — only `index.ts` changes

7. **No LLM needed** — The server contains ordinary business logic. It doesn't know or care which model or host connects to it.

## Command

```bash
npm run server   # Start the MCP server over STDIO
```

## Swap to HTTP

To use Streamable HTTP instead of STDIO, swap only this line in `src/index.ts`:

```typescript
// Before (STDIO):
serveStdio(createServer, { onerror: ... });

// After (Streamable HTTP):
serveHttp(createServer, { /* http options */ });
```