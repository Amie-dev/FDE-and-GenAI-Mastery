# Chapter 9 — Express App Entry Point

> File: `src/app.ts`
>
> Purpose: The Express application entry point. Sets up middleware, mounts routes, starts the server, and exports the app for testing or deployment.

## Full Code File

```typescript
import dotenv from 'dotenv';
import express from 'express';
import { config } from './config/config';
import router from './routes/index';

dotenv.config();

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vectorless-rag-basic', env: config.nodeEnv });
});

app.use('/api', router);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port} (${config.nodeEnv})`);
});

export default app;
```

## Command (if needed)

```bash
# Build TypeScript
npx tsc

# Start the server
node dist/app.js

# Or run in development with ts-node
npx ts-node src/app.ts
```

## Block-by-Block Explanation

### Block 1 — Load environment variables
```typescript
import dotenv from 'dotenv';
import express from 'express';
import { config } from './config/config';
import router from './routes/index';

dotenv.config();
```
**What this does:** Imports dotenv, express, the central config, and the routes router. Loads `.env` variables into `process.env`.

**How it works:** `dotenv.config()` reads the `.env` file so that `process.env.PORT`, `process.env.NODE_ENV`, etc. are available. The `config` object (Chapter 1) reads from these variables with sensible defaults.

### Block 2 — Create Express app and middleware
```typescript
const app = express();
app.use(express.json());
```
**What this does:** Creates the Express application instance and adds JSON body-parsing middleware.

**How it works:** `express.json()` parses incoming request bodies with `Content-Type: application/json`, making `req.body` available in route handlers.

### Block 3 — Health check route
```typescript
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vectorless-rag-basic', env: config.nodeEnv });
});
```
**What this does:** Registers a simple GET `/health` endpoint that returns server status.

**How it works:** Returns JSON with status, service name, and the current environment (from `config.nodeEnv`). Useful for verifying the server is running.

### Block 4 — Mount API routes
```typescript
app.use('/api', router);
```
**What this does:** Mounts all API routes (defined in `src/routes/index.ts`) under the `/api` path prefix.

**How it works:** Any request to `/api/...` is forwarded to the router, which dispatches to the appropriate controller based on the path and HTTP method.

### Block 5 — Start the server
```typescript
app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port} (${config.nodeEnv})`);
});
```
**What this does:** Starts the Express HTTP server listening on the configured port.

**How it works:** Uses `config.port` (from `.env` or default 3000). Logs a message with the URL and environment when the server is ready.

### Block 6 — Export app
```typescript
export default app;
```
**What this does:** Exports the Express app instance.

**How it works:** Allows the app to be imported in tests or deployment scripts without starting the server again.

