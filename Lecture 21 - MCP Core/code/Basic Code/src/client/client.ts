#!/usr/bin/env node
import { McpClient } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { fileURLToPath } from "url";
import path from "path";

/**
 * Chapter 07 — Discovery, Invocation & Lifecycle.
 *
 * This client demonstrates the 6-step lifecycle from the notes:
 *   1. DISCOVERY  → tools/list  (cached catalogue)
 *   2. SELECTION  → pick a tool (the model's job; here we hard-code it)
 *   3. INVOCATION → tools/call  (execute the tool)
 *   4. FAILURE    → isError: true result (recoverable by the model)
 *   5. RESOURCES  → resources/list + resources/read
 *   6. PROMPTS    → prompts/list + prompts/get
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEntry = path.resolve(__dirname, "../index.ts");

// Spawn the MCP server as a child process over STDIO (Chapter 04).
const transport = new StdioClientTransport({
  command: "tsx",
  args: [serverEntry],
});

const client = new McpClient({ name: "demo-client", version: "1.0.0" });
await client.connect(transport);

// ── 1. DISCOVERY ─────────────────────────────────────────────────────────────
// tools/list returns the cached catalogue — not called on every message.
const { tools } = await client.listTools();
console.log(`\n[1] DISCOVERY — tools/list -> ${tools.map((t) => t.name).join(", ")}`);

// ── 2. SELECTION ─────────────────────────────────────────────────────────────
// In production the LLM picks the tool (probabilistic). Here we hard-code it
// to make the lifecycle deterministic and testable.
const selected = tools.find((t) => t.name === "create_task");
if (!selected) throw new Error("create_task missing from catalogue");
console.log(`\n[2] SELECTION — model chose: ${selected.name}`);

// ── 3. INVOCATION ────────────────────────────────────────────────────────────
// tools/call — the host routes the model's choice to the right server.
const created = await client.callTool({
  name: "create_task",
  arguments: { title: "Record MCP Video" },
});
console.log(`\n[3] INVOCATION — create_task result:`, created.content);

// ── 4. FAILURE (isError: true) ────────────────────────────────────────────────
// A tool execution error is a *result* with isError: true, NOT a JSON-RPC error.
// The text lands in the model's context so it can recover.
const failed = await client.callTool({
  name: "complete_task",
  arguments: { title: "No such task" },
});
console.log(`\n[4] FAILURE — isError: ${failed.isError}`, failed.content);

// ── 5. RESOURCES ─────────────────────────────────────────────────────────────
// Resources are application-driven (not model-driven). The app reads them,
// then injects the content into the model's context.
const { resources } = await client.listResources();
const read = await client.readResource({ uri: resources[0].uri });
console.log(`\n[5] RESOURCES — read "${resources[0].name}":`, read.contents[0]);

// ── 6. PROMPTS ───────────────────────────────────────────────────────────────
// Prompts are user-driven: the UI lists them, the user picks one, and the
// host calls prompts/get with arguments substituted.
const { prompts } = await client.listPrompts();
const prompt = await client.getPrompt({
  name: "review_pull_request",
  arguments: { prNumber: "42" },
});
console.log(`\n[6] PROMPTS — "${prompts[0].name}":`, prompt.messages[0].content);

await client.close();
