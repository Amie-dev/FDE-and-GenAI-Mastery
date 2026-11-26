# Chapter 04: End-to-End Demo & Release Gate Tests

> **Chapter goal:** run both `openApiMcpServer` and `codeMcpServer` (`src/index.ts`) and verify all 5 release gates (`src/release-gate.test.ts`).
> **Notes chapter covered:** 08 (Production Code Mode Governance & Evals).

---

## 4.1 Full code: `src/index.ts` & `src/release-gate.test.ts`

File path: `code/Basic Code/src/index.ts`

```ts
import { createCodeMcpServer, createOpenApiMcpServer } from "./codemode-mcp.js";
import { IsolatedSandboxExecutor } from "./executor.js";
import { countOpenApiEndpoints, estimateTokens, generateEnterpriseOpenApiSpec } from "./openapi-spec.js";

async function main(): Promise<void> {
  const executor = new IsolatedSandboxExecutor();
  const spec = generateEnterpriseOpenApiSpec(216); // 220 total endpoints
  const endpointCount = countOpenApiEndpoints(spec);
  const naiveTokens = estimateTokens(spec.paths);

  console.log("=== 1. openApiMcpServer (220-Endpoint OpenAPI Spec) ===");
  const apiServer = createOpenApiMcpServer({
    spec,
    executor,
    callerScopes: ["dns:read"],
    request: async ({ path }) => {
      if (path === "/zones") {
        return { result: [{ id: "z1", name: "example.com" }, { id: "z2", name: "legacy.org" }] };
      }
      if (path === "/zones/z1/dns_records") {
        return { result: [{ type: "TXT", content: "v=DMARC1; p=reject" }] };
      }
      if (path === "/zones/z2/dns_records") {
        return { result: [{ type: "A", content: "192.0.2.1" }] };
      }
      return { result: [] };
    },
  });

  console.log(`Endpoints: ${endpointCount} | Naive Schema Tokens: ~${naiveTokens} | Code Mode Tokens: ${apiServer.getSchemaTokenCount()}`);
  console.log("Search('dns'):", apiServer.search("dns"));

  const execRes = await apiServer.execute(`
    const zones = await request({ method: "GET", path: "/zones" });
    const missingDmarc = [];
    for (const z of zones.result) {
      const dns = await request({ method: "GET", path: "/zones/" + z.id + "/dns_records" });
      if (!dns.result.some((r) => r.content.includes("DMARC1"))) {
        missingDmarc.push(z.name);
      }
    }
    return missingDmarc;
  `);
  console.log("Execute() Result (Missing DMARC):", execRes);

  console.log("\n=== 2. codeMcpServer (Single 'code' Tool Pattern) ===");
  const wrapped = createCodeMcpServer({
    executor,
    upstreamTools: {
      getAccount: { description: "Fetch account metadata", handler: async () => ({ id: "acc_1", plan: "enterprise" }) },
      listWorkers: { description: "List deployed Workers", handler: async () => (["api-gateway", "codemode-mcp"]) },
    },
  });
  console.log("codeMcpServer tools:", wrapped.listTools().map((t) => t.name), "| Tokens:", wrapped.getSchemaTokenCount());
  const codeRes = await wrapped.callCode(`
    const acc = await codemode.getAccount({});
    const workers = await codemode.listWorkers({});
    return { account: acc.id, workerCount: workers.length };
  `);
  console.log("codeMcpServer Result:", codeRes);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

File path: `code/Basic Code/src/release-gate.test.ts`

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCodeMcpServer, createOpenApiMcpServer } from "./codemode-mcp.js";
import { IsolatedSandboxExecutor } from "./executor.js";
import { countOpenApiEndpoints, generateEnterpriseOpenApiSpec } from "./openapi-spec.js";

describe("Lecture 31 Release Gate", () => {
  it("Gate 1: openApiMcpServer exposes 200+ endpoints using < 1,500 schema tokens", () => {
    const spec = generateEnterpriseOpenApiSpec(216);
    assert.ok(countOpenApiEndpoints(spec) >= 200);

    const server = createOpenApiMcpServer({
      spec,
      executor: new IsolatedSandboxExecutor(),
      request: async () => ({ ok: true }),
    });

    const tokenCount = server.getSchemaTokenCount();
    assert.ok(tokenCount < 1500, `Expected < 1,500 schema tokens, got ${tokenCount}`);
    assert.deepEqual(server.listTools().map((t) => t.name), ["search", "execute"]);
  });

  it("Gate 2: Agent discovers endpoints via search() and runs multi-step loop in one execute() call", async () => {
    const spec = generateEnterpriseOpenApiSpec(216);
    const server = createOpenApiMcpServer({
      spec,
      executor: new IsolatedSandboxExecutor(),
      request: async ({ path }) => {
        if (path === "/zones") return { result: [{ id: "z1", name: "a.com" }, { id: "z2", name: "b.com" }] };
        if (path === "/zones/z1/dns_records") return { result: [{ content: "v=DMARC1" }] };
        return { result: [{ content: "1.2.3.4" }] };
      },
    });

    const found = server.search("dns");
    assert.ok(found.length >= 2);

    const res = await server.execute(`
      const zones = await request({ method: "GET", path: "/zones" });
      const missing = [];
      for (const z of zones.result) {
        const recs = await request({ method: "GET", path: "/zones/" + z.id + "/dns_records" });
        if (!recs.result.some((r) => r.content.includes("DMARC1"))) missing.push(z.name);
      }
      return missing;
    `);
    assert.equal(res.ok, true);
    assert.deepEqual(res.result, ["b.com"]);
  });

  it("Gate 3: Sandbox blocks raw fetch() (globalOutbound: null) and leaks zero host secrets", async () => {
    process.env.TEST_SECRET_TOKEN = "super-secret-value";
    const server = createOpenApiMcpServer({
      spec: generateEnterpriseOpenApiSpec(10),
      executor: new IsolatedSandboxExecutor(),
      request: async () => ({ ok: true }),
    });

    const fetchAttempt = await server.execute(`return await fetch("https://evil.example.com");`);
    assert.equal(fetchAttempt.ok, false);
    assert.ok(fetchAttempt.error?.includes("globalOutbound is null"));

    const secretAttempt = await server.execute(`return typeof process === "undefined" ? "NO_PROCESS" : process.env.TEST_SECRET_TOKEN;`);
    assert.equal(secretAttempt.ok, true);
    assert.equal(secretAttempt.result, "NO_PROCESS");
  });

  it("Gate 4: OAuth scope downscoping blocks unauthorized POST mutations inside execute()", async () => {
    const server = createOpenApiMcpServer({
      spec: generateEnterpriseOpenApiSpec(10),
      executor: new IsolatedSandboxExecutor(),
      callerScopes: ["dns:read"],
      request: async () => ({ ok: true }),
    });

    const mutation = await server.execute(`return await request({ method: "POST", path: "/zones/z1/dns_records", body: {} });`);
    assert.equal(mutation.ok, false);
    assert.ok(mutation.error?.includes("403 Insufficient Scope"));
  });

  it("Gate 5: codeMcpServer wraps upstream tools into a single `code` tool with codemode.* namespace", async () => {
    const wrapped = createCodeMcpServer({
      executor: new IsolatedSandboxExecutor(),
      upstreamTools: {
        ping: { description: "Health check", handler: async () => "pong" },
      },
    });
    assert.deepEqual(wrapped.listTools().map((t) => t.name), ["code"]);
    const res = await wrapped.callCode(`return await codemode.ping({});`);
    assert.equal(res.ok, true);
    assert.equal(res.result, "pong");
  });
});
```

### Verification Commands

```bash
npm install
npm run typecheck
npm start
npm test
```

