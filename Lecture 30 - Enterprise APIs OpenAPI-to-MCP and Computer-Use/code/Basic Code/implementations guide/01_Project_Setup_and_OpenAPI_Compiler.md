# Chapter 01: Project Setup, Types & OpenAPI-to-MCP Compiler

> **Chapter goal:** configure `package.json` / `tsconfig.json`, define `src/types.ts`, and build `compileOpenApiToMcp()` in `src/openapi-to-mcp.ts`.
> **Notes chapters covered:** 01 (API Readiness) & 02 (OpenAPI-to-MCP Adaptation).

---

## 1.1 Full code: `package.json`, `tsconfig.json` & `src/types.ts`

File path: `code/Basic Code/package.json`

```json
{
  "name": "lecture-30-openapi-to-mcp-computer-use",
  "version": "1.0.0",
  "description": "Lecture 30 Basic Code — OpenAPI-to-MCP Adapter, Idempotency Keys, Approval Gate & Playwright Fallback",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "openapi",
    "mcp",
    "idempotency",
    "playwright",
    "computer-use",
    "typescript"
  ],
  "license": "ISC",
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

File path: `code/Basic Code/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

File path: `code/Basic Code/src/types.ts`

```ts
export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface OpenApiOperation {
  operationId: string;
  summary: string;
  method: HttpMethod;
  path: string;
  requiredParams: string[];
  approvalThresholdUsd?: number;
}

export interface OpenApiSpec {
  title: string;
  baseUrl: string;
  operations: OpenApiOperation[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  method: HttpMethod;
  path: string;
  requiresIdempotency: boolean;
  approvalThresholdUsd?: number;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export interface ToolExecutionResponse {
  status: "EXECUTED" | "REPLAYED" | "PENDING_APPROVAL";
  replayed: boolean;
  data: Record<string, unknown>;
}

export interface BrowserActionStep {
  action: "goto" | "fill" | "click" | "waitForSelector";
  selectorOrUrl: string;
  value?: string;
}
```

---

## 1.2 Full code: `src/openapi-to-mcp.ts`

File path: `code/Basic Code/src/openapi-to-mcp.ts`

```ts
import type { HttpMethod, McpToolDefinition, OpenApiSpec } from "./types.js";

/**
 * Compiles an OpenAPI 3.1 specification into governed MCP tools:
 * - Filters out destructive methods (e.g., DELETE)
 * - Auto-injects mandatory `idempotencyKey` on POST/PATCH mutations
 * - Enriches descriptions with side-effect and approval hints
 */
export function compileOpenApiToMcp(
  spec: OpenApiSpec,
  options: { allowedMethods?: HttpMethod[] } = {}
): McpToolDefinition[] {
  const allowed = new Set<HttpMethod>(options.allowedMethods ?? ["GET", "POST", "PATCH"]);
  const tools: McpToolDefinition[] = [];

  for (const op of spec.operations) {
    if (!allowed.has(op.method)) {
      continue; // Drop unsafe DELETE / disallowed methods
    }

    const isMutation = op.method === "POST" || op.method === "PATCH";
    const properties: Record<string, { type: string; description: string }> = {};
    const required = [...op.requiredParams];

    for (const p of op.requiredParams) {
      properties[p] = {
        type: p.toLowerCase().includes("amount") ? "number" : "string",
        description: `Parameter ${p} for ${op.operationId}`,
      };
    }

    if (isMutation) {
      properties.idempotencyKey = {
        type: "string",
        description: "Unique key guaranteeing exactly-once execution across retries.",
      };
      if (!required.includes("idempotencyKey")) {
        required.push("idempotencyKey");
      }
    }

    const prefix = isMutation ? "[MUTATING - IDEMPOTENT] " : "[READ-ONLY] ";
    const approvalHint =
      op.approvalThresholdUsd !== undefined ? ` (HITL approval required above $${op.approvalThresholdUsd})` : "";

    tools.push({
      name: op.operationId,
      description: `${prefix}${op.summary}${approvalHint}`,
      method: op.method,
      path: op.path,
      requiresIdempotency: isMutation,
      approvalThresholdUsd: op.approvalThresholdUsd,
      inputSchema: {
        type: "object",
        properties,
        required,
      },
    });
  }

  return tools;
}
```

### Explanation
- **Allow-list filtering:** Drops `DELETE` operations by default so agents cannot accidentally wipe records.
- **Automatic `idempotencyKey` injection:** Every `POST`/`PATCH` tool gets `idempotencyKey` added to `inputSchema.required` automatically.

