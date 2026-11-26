/**
 * Server entry point for the Lecture 13 semantic search project.
 *
 * This file:
 *   1. Reads the port from config (envConfig).
 *   2. Builds the dependency chain (see routes/search.routes.ts for the
 *      wiring order).
 *   3. Starts the Express server and prints the available endpoints.
 *
 * Run with:  npm run dev     (uses tsx for fast TS execution)
 * Build with: npm run build  (uses tsc)
 * Start with: npm start
 */

import express, { Express } from "express";
import { createRouter } from "./routes/search.routes.js";
import { envConfig } from "./config/env.config.js";

const app: Express = express();
const port = envConfig.port;

// Only JSON body parsing (semantic search sends its question as a query
// string, so no body parsing is needed, but this keeps the project ready
// for future POST endpoints).
app.use(express.json());

// All application routes are attached through the router factory.
app.use("/", createRouter());

app.listen(port, () => {
  console.log(`\n  Lecture 13 — Semantic Search & Movie Recommendation`);
  console.log(`  🔌 Listening on http://localhost:${port}\n`);

  console.log("  Endpoints:");
  console.log("    GET  /health              health check");
  console.log("    GET  /catalog             list all movies");
  console.log("    GET  /search?query=...    semantic search");
  console.log("    GET  /similar?movieId=... similar movies");
  console.log("    GET  /status              pipeline status\n");

  console.log(
    "  Example:\n    curl 'http://localhost:3000/search?query=space survival story'",
  );
  console.log(
    "    curl 'http://localhost:3000/similar?movieId=1'\n",
  );
});