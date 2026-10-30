import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { createLogger, mcpPort, serverInfo } from "../config/config.js";
import { createServer as createMcpServer } from "../server/server.js";

const logger = createLogger("server");

/**
 * Chapter 01 — the transport binding.
 *
 * Streamable HTTP: the host reaches this process at `POST /mcp`. The server
 * itself (`src/server/server.ts`) knows nothing about it, so swapping this file
 * is the only change a different binding would need.
 *
 * Chapter 09 security point: `createMcpExpressApp` enforces origin/DNS-rebinding
 * validation, and `app.disable("x-powered-by")` keeps the response surface small.
 * Binding to 127.0.0.1 keeps the server off public interfaces by default.
 */
const handler = createMcpHandler(createMcpServer);
const nodeHandler = toNodeHandler(handler);

const app = createMcpExpressApp({ host: "127.0.0.1" });

app.disable("x-powered-by");

/**
 * `createMcpExpressApp` installs `express.json()`, which consumes the request
 * stream to populate `request.body`. `toNodeHandler` would otherwise try to read
 * that same stream and find it already drained — so the third argument is how the
 * parsed body is handed across.
 */
app.all("/mcp", (request, response) => {
  void nodeHandler(request, response, request.body);
});

const httpServer = app.listen(mcpPort, "127.0.0.1", () => {
  logger.info({ port: mcpPort, name: serverInfo.name, version: serverInfo.version }, "MCP server listening");
  console.error(`[${serverInfo.name}] v${serverInfo.version} MCP endpoint on http://127.0.0.1:${mcpPort}/mcp`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    logger.info({ signal }, "Shutting down MCP server");
    void handler.close();
    httpServer.close();
  });
}