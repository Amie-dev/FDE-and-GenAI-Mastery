// index.ts — Application entry point
//
// Wires together config → routes → error handling, then starts the Express
// server. Each chapter maps to a different route group, so you can orient
// yourself by looking at the route table below.

import express from "express";
import dotenv from "dotenv";
import config from "./config/config.js";
import router from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Load .env (config/config.ts already does this, but this is explicit)
dotenv.config();

const app = express();
const PORT = config.port;

// Request body parser (needed for POST/PUT in future chapters)
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
  console.log(`\n  🎓 FDE & GenAI Mastery — Lecture 12: Vector Embeddings`);
  console.log(`  📡 Server running at http://localhost:${PORT}`);
  console.log(`  🛠️  Endpoints:`);
  console.log(`       GET  /api/health`);
  console.log(`       GET  /api/sentences`);
  console.log(`       GET  /api/similarity?a=&b=`);
  console.log(`       GET  /api/neighbors?text=&top=`);
  console.log(`       GET  /api/similarity/chart`);
  console.log(`       GET  /api/vector-arithmetic`);
  console.log(`  📖 Start with: GET /api/similarity/chart (shows the build-target insight)\n`);
});
