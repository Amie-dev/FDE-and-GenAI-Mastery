# Chapter 6 — Middleware & Entry Point (`src/middleware/errorHandler.ts` + `src/index.ts`)

> Purpose: Wire the app together — body parsing, routing, 404 handling, centralised errors — then start the server.

## 1. File Details

- **Path A:** `src/middleware/errorHandler.ts` — centralised error handler (must be last middleware).
- **Path B:** `src/index.ts` — app entry point; creates Express app, mounts routes, starts listening.
- **Notes mapping:** supports all chapters (runs the eval server).
- **Command:** `npm start` runs `node dist/index.js` (this file compiled).

## 2. Full Code File — `src/middleware/errorHandler.ts`

```typescript
// middleware/errorHandler.ts — Centralised error handling
import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("[error]", err.message);
  res.status(500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
}
```

### Block-by-Block — `errorHandler.ts`

- **Signature** `(err, _req, res, _next)`: Express recognises this 4-argument signature as an error-handling middleware.
- **`console.error("[error]", err.message)`**: logs the error server-side for debugging.
- **`res.status(500).json({ ... })`**: returns a consistent JSON error response instead of crashing or leaking stack traces.

## 3. Full Code File — `src/index.ts`

```typescript
// index.ts — Application entry point
// Wires together config → routes → error handling, then starts the Express server.

import express from "express";
import dotenv from "dotenv";
import config from "./config/config.js";
import router from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Load .env (config/config.ts already does this, but this is explicit)
dotenv.config();

const app = express();
const PORT = config.port;

// Request body parser (needed for POST /api/eval/run)
app.use(express.json());

// Mount all feature routes on the /api base path
app.use("/api", router);

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: _req.path,
  });
});

// Centralised error handler (must be last)
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`\n  🎓 FDE & GenAI Mastery — Lecture 30: Evals and Testing`);
  console.log(`  📡 Server running at http://localhost:${PORT}`);
  console.log(`  🛠️  Endpoints:`);
  console.log(`       GET  /api/health`);
  console.log(`       POST /api/eval/run`);
  console.log(`  📖 Start with: GET /api/health\n`);
});
```

### Block-by-Block — `index.ts`

- **`import express ... dotenv ... config ... router ... errorHandler`**: wires all layers together.
- **`dotenv.config()`**: ensures `.env` is loaded before the server starts.
- **`const app = express(); const PORT = config.port;`**: creates the app and reads the port from config (no hardcoded numbers).
- **`app.use(express.json())`**: parses JSON bodies so `POST /api/eval/run` can read `req.body`.
- **`app.use("/api", router)`**: mounts all routes under `/api`.
- **404 handler**: returns JSON for unknown routes.
- **`app.use(errorHandler)`**: centralised error handler, registered last (Express convention).
- **`app.listen(PORT, ...)`**: starts the server and prints the endpoint list.

## 4. How It Works Together

Request flow: `POST /api/eval/run` → Express parses JSON → router matches → `evalController.runEval` → `runEval` service → deterministic scores → JSON response. Errors at any point are caught by `errorHandler`.