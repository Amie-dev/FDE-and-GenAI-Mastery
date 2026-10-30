# Chapter 00: File Structure

## Code Structure

```
code/Basic Code/
├── .env              ← Environment configuration (MCP_SERVER_NAME, MCP_SERVER_VERSION, MCP_TRANSPORT)
├── package.json      ← npm dependencies and scripts
├── package-lock.json ← Locked dependency tree
├── tsconfig.json     ← TypeScript configuration
└── src/
    ├── index.ts              ← Main entry point — STDIO transport binding
    ├── client/
    │   └── client.ts         ← MCP client — discovery, invocation, resources, prompts lifecycle
    ├── config/
    │   └── config.ts         ← Server identity and transport config
    ├── prompts/
    │   └── prompts.ts        ← Prompt definitions (reuse primitive)
    ├── resources/
    │   └── resources.ts      ← Resource definitions (know primitive)
    ├── server/
    │   └── server.ts         ← MCP server factory — assembles tools, resources, prompts
    ├── services/
    │   └── taskService.ts    ← Business logic — execution layer (unit-testable)
    └── tools/
        └── tools.ts          ← Tool definitions (do primitive)
```

## How to Run

```bash
# Install dependencies
npm install

# Typecheck
npm run typecheck

# Start the MCP server (STDIO transport)
npm run server

# Run the client lifecycle demo (in another terminal)
npm run client
```

## File Details

| File | Role | Chapter |
|------|------|---------|
| `src/config/config.ts` | Server identity (name, version) and transport setting | Ch 02, Ch 08 |
| `src/server/server.ts` | `createServer()` factory — assembles all primitives | Ch 02, Ch 04 |
| `src/tools/tools.ts` | Tool registrations: `create_task`, `list_tasks`, `complete_task` | Ch 05 |
| `src/resources/resources.ts` | Resource registrations: company policies as URIs | Ch 06 |
| `src/prompts/prompts.ts` | Prompt registrations: `review_pull_request` | Ch 06 |
| `src/services/taskService.ts` | In-memory task store — create, list, complete | Ch 05, Ch 07 |
| `src/index.ts` | STDIO entry point — binds `createServer()` to stdio | Ch 04 |
| `src/client/client.ts` | Client lifecycle — discovery → selection → invocation → failure → resources → prompts | Ch 07 |
