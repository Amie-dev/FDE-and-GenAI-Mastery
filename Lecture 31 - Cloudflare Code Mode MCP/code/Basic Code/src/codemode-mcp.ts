import type { IsolatedSandboxExecutor } from "./executor.js";
import type { OpenApiDocument } from "./openapi-spec.js";
import { estimateTokens } from "./openapi-spec.js";

export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type UpstreamToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

/**
 * Single Code Tool Pattern (mirrors `codeMcpServer` from `@cloudflare/codemode/mcp`):
 * Collapses N upstream MCP tools into 1 `code` tool backed by a typed `codemode.*` namespace.
 */
export function createCodeMcpServer(params: {
  upstreamTools: Record<string, { description: string; handler: UpstreamToolHandler }>;
  executor: IsolatedSandboxExecutor;
}) {
  const signatures = Object.entries(params.upstreamTools)
    .map(([name, t]) => `  ${name}(args: Record<string, unknown>): Promise<unknown>; // ${t.description}`)
    .join("\n");

  const toolDefinition: McpToolSchema = {
    name: "code",
    description: `Execute TypeScript/JS using the typed codemode API:\ndeclare const codemode: {\n${signatures}\n};`,
    inputSchema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
    },
  };

  return {
    listTools: (): McpToolSchema[] => [toolDefinition],
    getSchemaTokenCount: (): number => estimateTokens([toolDefinition]),
    callCode: async (code: string) => {
      const codemode: Record<string, UpstreamToolHandler> = {};
      for (const [name, t] of Object.entries(params.upstreamTools)) {
        codemode[name] = t.handler;
      }
      return params.executor.execute({ code, bindings: { codemode } });
    },
  };
}

export type HostRequestProxy = (req: {
  method: string;
  path: string;
  body?: unknown;
}) => Promise<unknown>;

/**
 * Search & Execute Pattern (mirrors `openApiMcpServer` from `@cloudflare/codemode/mcp`):
 * Exposes ONLY 2 tools (`search` and `execute`) totaling < 1,500 tokens even for 200+ endpoints.
 */
export function createOpenApiMcpServer(params: {
  spec: OpenApiDocument;
  executor: IsolatedSandboxExecutor;
  request: HostRequestProxy;
  callerScopes?: string[];
}) {
  const tools: McpToolSchema[] = [
    {
      name: "search",
      description: "Search the OpenAPI 3.1 specification by keyword or tag to discover matching endpoints.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
    {
      name: "execute",
      description:
        "Execute a JS/TS snippet inside an isolated sandbox using `await request({ method, path, body })`. Loops and filtering stay in the sandbox.",
      inputSchema: {
        type: "object",
        properties: { code: { type: "string" } },
        required: ["code"],
      },
    },
  ];

  const allowedScopes = new Set(params.callerScopes ?? ["dns:read", "workers:read"]);

  return {
    listTools: (): McpToolSchema[] => tools,
    getSchemaTokenCount: (): number => estimateTokens(tools),
    search: (query: string) => {
      const q = query.toLowerCase();
      const matches: Array<{ method: string; path: string; operationId: string; summary: string }> = [];
      for (const [path, methods] of Object.entries(params.spec.paths)) {
        for (const [method, op] of Object.entries(methods)) {
          if (
            path.toLowerCase().includes(q) ||
            op.summary.toLowerCase().includes(q) ||
            op.tags.some((t) => t.toLowerCase().includes(q))
          ) {
            matches.push({ method: method.toUpperCase(), path, operationId: op.operationId, summary: op.summary });
          }
        }
      }
      return matches;
    },
    execute: async (code: string) => {
      // Host-side RPC proxy enforces OAuth scope & keeps API tokens outside the sandbox
      const scopedRequest: HostRequestProxy = async (req) => {
        if (req.method.toUpperCase() !== "GET" && !allowedScopes.has("dns:write")) {
          throw new Error(`403 Insufficient Scope: '${req.method}' requires 'dns:write' scope`);
        }
        return params.request(req);
      };
      return params.executor.execute({ code, bindings: { request: scopedRequest } });
    },
  };
}

