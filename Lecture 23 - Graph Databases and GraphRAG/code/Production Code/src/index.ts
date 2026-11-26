import "dotenv/config";
import app from "./app";
import { config } from "./config/config";
import { getDriver, closeDriver } from "./db/driver";
import { logger } from "./middleware/logging";

async function main(): Promise<void> {
  const server = app.listen(config.port, () => {
    logger.info(`🚀 Production GraphRAG service listening on :${config.port}`);
    logger.info(`NODE_ENV=${config.NODE_ENV}`);
    logger.info(`Vector index=${config.VECTOR_INDEX}, Top K=${config.VECTOR_TOP_K}`);
  });

  const shutdown = async () => {
    logger.info("Shutting down...");
    server.close();
    await closeDriver();
    process.exit(0);
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

void main();

export { app };