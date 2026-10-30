# Chapter 08: Security, Production and Practical Architecture

## Key Concepts

- Security stays with the host (application layer), not the server
- OAuth resource servers for authentication
- Threat model: token leakage, scope creep, hardcoded endpoints
- Progressive least privilege (start minimal, add as needed)
- Production: timeouts, retries, fallbacks, monitoring

## Code Implementation

### `src/config/config.ts` — Server Identity and Transport

```typescript
import "dotenv/config";

export const serverInfo = {
  name: process.env.MCP_SERVER_NAME ?? "task-mcp-server",
  version: process.env.MCP_SERVER_VERSION ?? "1.0.0",
};

export const transport = process.env.MCP_TRANSPORT ?? "stdio";

export const policyScheme = "company";
```

### `src/tools/tools.ts` — Security in Tool Definitions

```typescript
server.registerTool(
  "create_task",
  {
    title: "Create Task",
    description: "...",
    inputSchema: z.object({
      title: z.string().min(1).describe("Title of the task to create"),
    }),
    outputSchema: taskSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ title }) => {
    const task = taskService.create(title);
    return {
      content: [{ type: "text" as const, text: `Task #${task.id} created: ${task.title} (${task.status})` }],
      structuredContent: task,
    };
  },
);
```

## Code Block Explanation

### `src/config/config.ts`

1. **`import "dotenv/config"`** — Loads `.env` variables into `process.env`. All sensitive configuration comes from environment variables, never hardcoded in source code. This prevents hardcoded endpoints, server names, and transport settings.

2. **`serverInfo`** — Identifies the server to clients during `initialize`:
   - `name: process.env.MCP_SERVER_NAME ?? "task-mcp-server"` — Server name from `.env` with fallback
   - `version: process.env.MCP_SERVER_VERSION ?? "1.0.0"` — Server version from `.env` with fallback
   - Both are read from `.env`, not hardcoded — makes deployment across environments easier

3. **`transport`** — Controls transport mode:
   - `process.env.MCP_TRANSPORT ?? "stdio"` — Defaults to `"stdio"` (local child process)
   - Can be changed to `"streamable-http"` for remote/networked deployments without code changes

4. **`policyScheme`** — Custom URI scheme (`"company"`) for resources. Not hardcoded as `https://` because:
   - `https://` implies the client can independently fetch the URI
   - Custom scheme means only this server can serve the content
   - Helps prevent confused deputy attacks where a client follows a URI to an unintended destination

### Tool Annotations as Security Hints

Each tool in `src/tools/tools.ts` includes annotations:

```typescript
annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
```

These annotations guide host policy decisions:

| Annotation | Meaning | Security Implication |
|------------|---------|---------------------|
| `readOnlyHint: false` | Tool modifies state | Host may require user confirmation before execution |
| `destructiveHint: false` | Not destructive | Lower risk — doesn't delete or destroy data |
| `idempotentHint: false` | Not safe to retry blindly | Host should not auto-retry on timeout |
| `openWorldHint: false` | Limited external interaction | Host may sandbox or rate-limit |

**Important**: Annotations are **hints, not guarantees**. Never let an annotation replace your own policy validation.

## Production Checklist

| Concern | Mitigation in Code |
|---------|-------------------|
| Timeouts | Tool handlers should complete quickly; use timeouts at transport layer |
| Retries | Protocol errors (JSON-RPC) retry-safe; tool errors (`isError`) require care |
| Error handling | Tool failures return `isError: true` result with recovery message |
| Monitoring | Console errors for stdio transport via `console.error` |
| Host security | Auth tokens managed by host; not forwarded to server |

## Threat Model Mitigations

| Threat | Mitigation in Code |
|--------|-------------------|
| **Hardcoded endpoints** | `config.ts` reads from `.env` (MCP_SERVER_NAME, MCP_TRANSPORT) — no hardcoded URLs |
| **Scope creep** | Zod input schemas validate only needed inputs (e.g., `z.string().min(1)` for title) |
| **Tool context poisoning** | Tool descriptions are vetted before registering; host shows them in consent UIs |
| **Forwarding user tokens** | Server uses its own credentials; user tokens are not passed downstream |
| **Confused deputy** | Custom URI scheme (`company://`) prevents clients from fetching unrelated URIs |

## Command

```bash
# Typecheck ensures no type-level issues
npm run typecheck

# Start server with custom config from .env
npm run server

# Client connects and runs lifecycle
npm run client
```
