import { readFileSync } from "fs";
import { join } from "path";
import { getDriver, closeDriver } from "../db/driver";

/** Run the schema + seed Cypher files against Neo4j (Chapter 08).
 * Safe to call multiple times: all statements use IF NOT EXISTS.
 */
export async function bootstrap(): Promise<void> {
  const driver = getDriver();
  const session = driver.session({ database: "neo4j" });

  try {
    for (const file of ["schema.cypher", "seed.cypher"]) {
      const sql = readFileSync(join(__dirname, "..", "db", file), "utf8");
      // Split on semicolons and run each statement.
      for (const stmt of sql
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
  bootstrap().catch(console.error);
}