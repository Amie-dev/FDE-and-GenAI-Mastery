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
export const serverInfo = {
  name: process.env.MCP_SERVER_NAME ?? "task-mcp-server",
  version: process.env.MCP_SERVER_VERSION ?? "1.0.0",
};

export const transport = process.env.MCP_TRANSPORT ?? "stdio";
```

- `serverInfo` identifies the server to clients
- `transport` controls stdio (local) vs streamable HTTP (remote)
- The same `createServer()` works for both

## Production Checklist

| Concern | Mitigation in Code |
|---------|-------------------|
| Timeouts | Tool-level timeouts (30s default) |
| Retries | Protocol errors (JSON-RPC) retry-safe; tool errors (isError) require care |
| Error handling | Tool failures return `isError: true` result with recovery message |
| Monitoring | Health endpoint (when HTTP), console errors for stdio |
| Host security | Auth tokens in host; tokens passed to server via headers |

## Threat Model Mitigations

- **Don't hardcode endpoints**: config.ts reads from `.env` (MCP_SERVER_NAME, MCP_TRANSPORT)
- **Progressive least privilege**: validate only needed inputs (zod schemas)
- **OAuth resource server**: auth middleware wraps routes in production deployments