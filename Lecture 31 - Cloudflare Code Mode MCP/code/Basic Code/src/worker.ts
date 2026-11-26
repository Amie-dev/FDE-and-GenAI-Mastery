/**
 * Production Cloudflare Worker reference (for `wrangler deploy` with `@cloudflare/codemode`).
 * Note: Kept as a typed reference alongside the runnable local Node sandbox in `src/index.ts`.
 */
export const CLOUDFLARE_WORKER_REFERENCE = `
import { DynamicWorkerExecutor } from "@cloudflare/codemode";
import { codeMcpServer, openApiMcpServer } from "@cloudflare/codemode/mcp";
import { createMcpHandler } from "agents/mcp";

export default {
  async fetch(request: Request, env: { LOADER: unknown; API_TOKEN: string }, ctx: unknown): Promise<Response> {
    const executor = new DynamicWorkerExecutor({ loader: env.LOADER });
    const server = await openApiMcpServer({
      spec: ENTERPRISE_OPENAPI_SPEC,
      executor,
      request: async ({ url, method, headers, body }) =>
        fetch(url, {
          method,
          headers: { ...headers, Authorization: \`Bearer \${env.API_TOKEN}\` },
          body,
        }),
    });
    return createMcpHandler(server)(request, env, ctx);
  },
};
`;

