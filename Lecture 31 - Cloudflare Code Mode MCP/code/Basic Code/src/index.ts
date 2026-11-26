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
      // Simulated host-side authenticated Cloudflare API proxy
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

