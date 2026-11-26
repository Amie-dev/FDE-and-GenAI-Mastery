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