import { readFileSync } from "fs";
import { join } from "path";
import { config } from "../config/config";
import { getDriver, closeDriver } from "../db/driver";

/**
 * Runs schema + seed Cypher files against Neo4j.
 * Idempotent — uses IF NOT EXISTS so re-running is safe.
 */
export async function bootstrap(): Promise<void> {
  const driver = getDriver();
  const session = driver.session({ database: config.NEO4J_DATABASE });

  try {
    for (const file of ["schema.cypher", "seed.cypher"]) {
      const cypher = readFileSync(join(__dirname, "..", "db", file), "utf8");
      for (const stmt of cypher
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)) {
        await session.run(stmt);
      }
    }
    console.log("✅ Bootstrap complete");
  } finally {
    await session.close();
    await closeDriver();
  }
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error("Bootstrap failed:", err);
    process.exit(1);
  });
}