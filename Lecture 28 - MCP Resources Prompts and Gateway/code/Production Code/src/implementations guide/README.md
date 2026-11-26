# Production Code — Chapter-Wise Implementation Guide

> **Goal:** walk through the production-ready code in `src/`, chapter by chapter,
> in the same order the lecture notes build the protocol.

## Production vs Basic Code

| Aspect | Basic Code | Production Code |
|---|---|---|
| Logging | `console.log` | Pino structured logger |
| Config | Hard-coded constants | Zod-validated env vars |
| Security | None | `helmet`, `cors`, `x-powered-by` disabled |
| Transport | Always Streamable HTTP | Same, but with graceful shutdown |
| Routes | One file, minimal | Express app with 404/500 handlers |
| Lifecycle | `npm run lifecycle` | Same, but with retry + graceful stop |

## Folder structure

```
src/
├── config/           # config.ts — validated env, serverInfo, createLogger
├── services/         # taskService.ts, resourceSelector.ts
├── resources/        # resources.ts — MCP Resource registrations
├── prompts/          # prompts.ts — MCP Prompt registrations
├── tools/            # tools.ts — MCP Tool registrations
├── server/           # server.ts (factory) + index.ts (entry point)
├── host/             # index.ts — Express host entry point
├── client/           # client.ts (wrappers) + lifecycle.ts (walkthrough)
└── routes/           # (legacy — now in host/index.ts)
```

## Run

```bash
npm run server    # MCP server on :8081
npm run host      # HTTP host on :8080
npm run lifecycle # walks the whole protocol offline
```

## Chapter map

| Chapter | File | What it covers |
|---|---|---|
| 01 | [01_Config_Server_Identity_and_Schemes.md](01_Config_Server_Identity_and_Schemes.md) | config.ts, env validation, logging |
| 02 | [02_Task_Service_The_Data_Layer.md](02_Task_Service_The_Data_Layer.md) | taskService.ts, resourceSelector.ts |
| 03 | [03_Resources_Static_Dynamic_and_Templated.md](03_Resources_Static_Dynamic_and_Templated.md) | resources.ts |
| 04 | [04_Resource_Selection_How_the_App_Chooses.md](04_Resource_Selection_How_the_App_Chooses.md) | resourceSelector.ts |
| 05 | [05_Prompts_Reusable_Templates_with_Arguments.md](05_Prompts_Reusable_Templates_with_Arguments.md) | prompts.ts |
| 06 | [06_Tools_and_Server_Assembly.md](06_Tools_and_Server_Assembly.md) | tools.ts, server.ts |
| 07 | [07_Client_Wiring_resources_read_and_prompts_get.md](07_Client_Wiring_resources_read_and_prompts_get.md) | client.ts, lifecycle.ts |
| 08 | [08_Entry_Point_and_Routes_GET_plan_hours_4.md](08_Entry_Point_and_Routes_GET_plan_hours_4.md) | server/index.ts, host/index.ts |