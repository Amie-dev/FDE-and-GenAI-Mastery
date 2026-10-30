# Chapter 01: The Integration Problem

## Code Structure

```
code/
├── .env           ← Environment configuration
├── package.json   ← npm dependencies  
├── tsconfig.json  ← TypeScript configuration
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
    └── index.ts         ← Main entry point (host)
```

## How to Run

```bash
npm install
npm run dev
# OR
npx tsx src/index.ts
```

Server starts using STDIO transport (child process over stdin/stdout).