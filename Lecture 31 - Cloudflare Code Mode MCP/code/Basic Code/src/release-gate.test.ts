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

