# Chapter 08 — App & Server Entry

**Notes source:** `notes/08_End_to_End_Cognitive_Memory_App.md`

**Goal:** Bootstrap the Express app and start the HTTP server with graceful shutdown.

---

## 1. `src/app.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/app.ts` |
| Chapter | 08 |
| What it does | Creates the Express app, parses JSON bodies, mounts routes. |

### Full code

```ts
import express from "express";
import routes from "./routes";

export const app = express();
app.use(express.json());
app.use(routes);

export default app;
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `express()` | Creates the Express application instance. |
| `app.use(express.json())` | Parses JSON request bodies so `req.body` is available. |
| `app.use(routes)` | Mounts the route handlers from `routes/index.ts`. |
| `export const app` | Exports the app for testing and for `index.ts` to listen. |

---

## 2. `src/index.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/index.ts` |
| Chapter | 08 |
| What it does | Starts the HTTP server and handles graceful shutdown. |

### Full code

```ts
import "dotenv/config";
import app from "./app";
import { config } from "./config/config";
import { closeDriver } from "./db/driver";

async function main(): Promise<void> {
  const server = app.listen(config.port, () => {
    console.log(`🚀 GraphRAG Basic Code listening on :${config.port}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close();
    await closeDriver();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

void main();
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `import "dotenv/config"` | Loads `.env` before anything else reads `process.env`. |
| `app.listen(config.port, ...)` | Starts the HTTP server on the configured port. |
| `shutdown` | Closes the server, closes the Neo4j driver, then exits. |
| `process.on("SIGTERM"/"SIGINT")` | Registers shutdown on terminate/interrupt signals. |
| `void main();` | Runs the async main function. |

### Command

```bash
npm run dev
```

### Self-check

1. Why close the driver on shutdown? → releases the Neo4j connection pool.