# Chapter 01: Project Setup & 220-Endpoint OpenAPI Spec

> **Chapter goal:** configure `package.json`, `tsconfig.json`, `wrangler.jsonc`, and `src/openapi-spec.ts`.
> **Notes chapters covered:** 01 (Tool Schema Scaling Wall) & 07 (Workers Config).

---

## 1.1 Full code: `package.json`, `tsconfig.json` & `wrangler.jsonc`

File path: `code/Basic Code/package.json`

```json
{
  "name": "lecture-31-cloudflare-codemode-mcp",
  "version": "1.0.0",
  "description": "Lecture 31 Basic Code — Cloudflare Code Mode MCP (codeMcpServer + openApiMcpServer + Sandbox Isolation)",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "cloudflare",
    "codemode",
    "mcp",
    "dynamic-workers",
    "openapi",
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

File path: `code/Basic Code/wrangler.jsonc`

```jsonc
{
  "name": "enterprise-codemode-mcp",
  "main": "src/worker.ts",
  "compatibility_date": "2026-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "worker_loaders": [
    { "binding": "LOADER" }
  ]
}
```

---

## 1.2 Full code: `src/openapi-spec.ts`

File path: `code/Basic Code/src/openapi-spec.ts`

```ts
export interface OpenApiEndpoint {
  operationId: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  tags: string[];
}

export interface OpenApiDocument {
  openapi: "3.1.0";
  info: { title: string; version: string };
  paths: Record<string, Record<string, { operationId: string; summary: string; tags: string[] }>>;
}

/**
 * Generates a 220-endpoint enterprise OpenAPI 3.1 spec (simulating Cloudflare-scale APIs)
 * to demonstrate the Tool Schema Scaling Wall vs. Code Mode's ~1,000-token collapse.
 */
export function generateEnterpriseOpenApiSpec(extraCount = 216): OpenApiDocument {
  const paths: OpenApiDocument["paths"] = {
    "/zones": {
      get: { operationId: "listZones", summary: "List all active DNS zones on the account", tags: ["dns", "zones"] },
    },
    "/zones/{zoneId}/dns_records": {
      get: { operationId: "listDnsRecords", summary: "List DNS records (TXT, A, CNAME) for a zone", tags: ["dns", "records"] },
      post: { operationId: "createDnsRecord", summary: "Create a new DNS record in a zone", tags: ["dns", "records"] },
    },
    "/accounts/{accountId}/workers/scripts": {
      get: { operationId: "listWorkers", summary: "List deployed Cloudflare Workers", tags: ["workers"] },
    },
  };

  for (let i = 1; i <= extraCount; i++) {
    paths[`/v4/enterprise/service_${i}/items`] = {
      get: {
        operationId: `listService${i}Items`,
        summary: `List paginated resources for enterprise service ${i}`,
        tags: ["enterprise", `service_${i}`],
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: { title: "Enterprise Cloud API", version: "4.0.0" },
    paths,
  };
}

export function countOpenApiEndpoints(spec: OpenApiDocument): number {
  let count = 0;
  for (const methods of Object.values(spec.paths)) {
    count += Object.keys(methods).length;
  }
  return count;
}

export function estimateTokens(obj: unknown): number {
  return Math.ceil(JSON.stringify(obj).length / 4);
}
```

### Explanation
- **`generateEnterpriseOpenApiSpec(216)`:** Builds 4 realistic Cloudflare-style DNS/Workers endpoints + 216 enterprise service endpoints = **220 endpoints**, proving the schema scaling wall before Code Mode collapses them.

