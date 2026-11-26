# Chapter 02: What MCP Is — Protocol, Server and Standard Interface

## Key Concepts

- **MCP** standardises *access*, not *capability*
- An MCP server needs **no LLM** — it is ordinary business logic behind a standard door
- The server identifies itself via `serverInfo` (name + version) at `initialize`
- `transport` selects STDIO (local subprocess) or Streamable HTTP (remote)

## Code Implementation

### `src/config/config.ts` — Server Identity and Transport

```typescript
import "dotenv/config";

export const serverInfo = {
  name: process.env.MCP_SERVER_NAME ?? "task-mcp-server",
  version: process.env.MCP_SERVER_VERSION ?? "1.0.0",
};

export const transport = process.env.MCP_TRANSPORT ?? "stdio";

export const policyScheme = "company";
```

### `src/server/server.ts` — MCP Server Factory

```typescript
import { McpServer } from "@modelcontextprotocol/server";
import { serverInfo } from "../config/config.js";
import { registerPrompts } from "../prompts/prompts.js";
import { registerResources } from "../resources/resources.js";
import { registerTools } from "../tools/tools.js";

export function createServer(): McpServer {
  const server = new McpServer(serverInfo);

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
```

## Code Block Explanation

### `src/config/config.ts`

1. **`import "dotenv/config"`** — Loads environment variables from `.env` into `process.env`. This lets us configure server name, version, and transport without changing code.

2. **`serverInfo`** — Defines the MCP server's identity that clients learn about during `initialize`. `name` and `version` come from `.env` with sensible defaults. This is the only server metadata the client sees — there is no model, prompt, or vendor SDK here.

3. **`transport`** — Controls which transport to use: `"stdio"` for local subprocess communication or `"streamable-http"` for remote network access. Read from `.env` with `"stdio"` default.

4. **`policyScheme`** — Custom URI scheme (`"company"`) for addressable resources. Used by `resources.ts` to build URIs like `company://policies/return-policy`.

### `src/server/server.ts`

1. **Imports** — Brings in `McpServer` from the MCP SDK, server identity from config, and registration functions for tools, resources, and prompts.

2. **`createServer()`** — The factory function that builds the MCP server:
   - `new McpServer(serverInfo)` creates the server with its identity
   - `registerTools(server)` adds the "do" primitive (executable capabilities)
   - `registerResources(server)` adds the "know" primitive (addressable context)
   - `registerPrompts(server)` adds the "reuse" primitive (user-controlled instructions)
   - Returns the fully assembled `McpServer` instance

3. **No LLM needed** — This file knows nothing about which host or model connects. It only exposes capabilities behind a standard MCP door.

## Command

```bash
npm run server   # Starts the MCP server over STDIO
```
