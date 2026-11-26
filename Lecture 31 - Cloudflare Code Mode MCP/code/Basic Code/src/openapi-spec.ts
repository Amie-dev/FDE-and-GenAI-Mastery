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

