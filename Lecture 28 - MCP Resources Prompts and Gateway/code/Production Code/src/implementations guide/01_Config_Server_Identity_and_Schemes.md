# Chapter 01 — Config: Server Identity and Schemes

> **Goal:** understand the environment validation and logger factory.

---

## 01.1 File details

| | |
|---|---|
| **Path** | `src/config/config.ts` |
| **Purpose** | validate environment variables, export constants, create structured loggers |
| **Uses** | `dotenv` (load .env), `zod` (schema validation), `pino` (structured logging) |
| **Exports** | `mcpPort`, `hostPort`, `mcpServerUrl`, `model`, `logLevel`, `hasModelKey`, `serverInfo`, `createLogger` |

---

## 01.2 Commands

```bash
npm run typecheck    # pass: zod validates env at startup
```

---

## 01.3 Full file

**Path:** `src/config/config.ts`

```ts
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  MCP_PORT: z.coerce.number().min(1).max(65535).default(8081),
  HOST_PORT: z.coerce.number().min(1).max(65535).default(8080),
  MCP_SERVER_URL: z.string().url().default("http://127.0.0.1:8081/mcp"),
  OPENAI_API_KEY: z.string().optional(),
  MODEL: z.string().default("gpt-4.1-mini"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

const env = envSchema.parse(process.env);

export const serverInfo = { name: "task-mcp-server", version: "1.0.0" as const };

export const mcpPort = env.MCP_PORT;
export const hostPort = env.HOST_PORT;
export const mcpServerUrl = env.MCP_SERVER_URL;
export const model = env.MODEL;
export const logLevel = env.LOG_LEVEL;

export const hasModelKey = Boolean(env.OPENAI_API_KEY);

export function createLogger(name: string) {
  const pino = require("pino");

  return pino({
    name,
    level: logLevel,
    transport: process.env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
  });
}
```

---

## 01.4 Block-by-block explanation

### Block 1 — `dotenv` and `zod` import

```ts
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();
```

- Immediately loads `.env` so all code below can read `process.env`.
- Zod v4 syntax: `z.coerce.number()` converts a string env var to a number,
  `z.enum([...])` parses a controlled vocabulary.

### Block 2 — the schema

```ts
const envSchema = z.object({
  MCP_PORT: z.coerce.number().min(1).max(65535).default(8081),
  HOST_PORT: z.coerce.number().min(1).max(65535).default(8080),
  MCP_SERVER_URL: z.string().url().default("http://127.0.0.1:8081/mcp"),
  OPENAI_API_KEY: z.string().optional(),
  MODEL: z.string().default("gpt-4.1-mini"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

const env = envSchema.parse(process.env);
```

- If any variable is missing or malformed, `envSchema.parse` throws — the
  entire server fails fast with a clear error message instead of limping along.

### Block 3 — the exports

```ts
export const serverInfo = { name: "task-mcp-server", version: "1.0.0" as const };
export const mcpPort = env.MCP_PORT;
export const hostPort = env.HOST_PORT;
export const mcpServerUrl = env.MCP_SERVER_URL;
export const model = env.MODEL;
export const logLevel = env.LOG_LEVEL;
export const hasModelKey = Boolean(env.OPENAI_API_KEY);
```

- All the constants the rest of the code needs, extracted once, validated.
- `hasModelKey` is **false** when `OPENAI_API_KEY` is missing or empty — that
  flag lets the client stay offline (Lecture 09).

### Block 4 — the logger factory

```ts
export function createLogger(name: string) {
  const pino = require("pino");
  return pino({ name, level: logLevel, transport: process.env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined });
}
```

- Returns a new Pino instance for each module. In development the output is
  pretty-printed; in production it is line-delimited JSON for log collectors.

---

## 01.5 Run / verify

```bash
npm run typecheck    # should pass silently
```

---

## 01.6 Checkpoint

1. What is the difference between `z.coerce.number()` and `z.number()`? — The
   coerce version parses strings like `"8080"` into `8080`; the raw version
   returns `NaN` if the input is not already a number.
2. Why does `hasModelKey = Boolean(OPENAI_API_KEY)`? — If the key is missing
   or empty string, the client prints the prompt text instead of calling an
   LLM, proving the protocol works offline.
3. What does `export const serverInfo = { name: "task-mcp-server", version: "1.0.0" as const }` do? — The `as const` makes the object deeply literal so it can be passed to `new McpServer(serverInfo)` without copying.

**Next:** [Chapter 02 — Task Service: The Data Layer](./02_Task_Service_The_Data_Layer.md)