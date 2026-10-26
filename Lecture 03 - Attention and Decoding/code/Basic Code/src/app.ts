import express, { type Express } from "express";
import { errorHandler, notFound } from "./middleware/errorHandler";
import router from "./routes";

/**
 * Build the Express app. Kept separate from server.ts so a test can import the
 * app without opening a port.
 */
export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: "1mb" })); // tokens and logits are small; the ceiling is a guard rail

  // One mounting point for every route, so versioning later is a one-line change.
  app.use("/api", router);

  app.use(notFound); // unknown route -> JSON 404
  app.use(errorHandler); // anything thrown -> JSON error

  return app;
}
