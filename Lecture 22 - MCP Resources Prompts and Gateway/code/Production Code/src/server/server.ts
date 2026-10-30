import { McpServer } from "@modelcontextprotocol/server";

import { serverInfo } from "../config/config.js";
import { registerPrompts } from "../prompts/prompts.js";
import { registerResources } from "../resources/resources.js";
import { registerTools } from "../tools/tools.js";

/**
 * Chapter 01 — one server factory that wires all three primitives together.
 *
 * The factory takes zero transport decisions: no model, no HTTP, no Express.
 * That keeps the MCP server pure — swap the binding without touching a line.
 *
 * Registration order:
 *   1. registerTools   → model holds the trigger    → capabilities
 *   2. registerResources → application holds the trigger → context
 *   3. registerPrompts   → user holds the trigger   → reusable workflows
 */
export function createServer(): McpServer {
  const server = new McpServer(serverInfo);

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
