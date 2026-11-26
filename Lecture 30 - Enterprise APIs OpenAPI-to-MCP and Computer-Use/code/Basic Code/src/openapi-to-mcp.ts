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

