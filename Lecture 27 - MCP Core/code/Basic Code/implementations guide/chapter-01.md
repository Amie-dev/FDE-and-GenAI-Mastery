# Chapter 01: The Integration Problem and Why Standards Win

## Key Concepts

- **N × M problem**: Without a standard, every AI app re-integrates every external capability
- **N + M scaling**: With MCP, every app speaks one protocol and every capability exposes it once
- MCP standardises *access*, not *intelligence*
- The lecture's three non-negotiable boundaries:
  1. An MCP server does not need an LLM
  2. MCP does not replace tool calling
  3. MCP standardises communication, not safety

## Code Structure

```
code/Basic Code/
├── .env              ← Environment configuration
├── package.json      ← npm dependencies and scripts
├── tsconfig.json     ← TypeScript configuration
└── src/
    ├── config/
    │   └── config.ts    ← MCP server configuration (serverInfo, transport)
    ├── server/
    │   └── server.ts    ← MCP server factory (createServer)
    ├── tools/
    │   └── tools.ts     ← Tool definitions (Tools: do)
    ├── resources/
    │   └── resources.ts ← Resource definitions (Resources: know)
    ├── prompts/
    │   └── prompts.ts   ← Prompt definitions (Prompts: reuse)
    ├── services/
    │   └── taskService.ts ← Business logic (execution layer)
    ├── index.ts         ← Main entry point (server binding)
    └── client/
        └── client.ts    ← Client lifecycle demo
```

## How to Run

```bash
npm install
npm run typecheck
npm run server   # Start MCP server (STDIO)
npm run client   # Run client lifecycle demo
```

Server starts using STDIO transport (child process over stdin/stdout).

## Command

```bash
npm run server   # Start the MCP server
npm run client   # Run the client lifecycle demo
```