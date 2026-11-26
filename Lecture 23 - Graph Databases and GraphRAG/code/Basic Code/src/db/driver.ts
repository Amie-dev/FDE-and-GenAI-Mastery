import neo4j, { Driver } from "neo4j-driver";
import { config } from "../config/config";

/** Singleton Neo4j driver (Chapter 04).
 *
 * One Driver instance per process. It owns the connection pool and
 * creates/destroys sessions on demand. Sessions must be closed after use.
 */

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (driver) return driver;

  driver = neo4j.driver(
    config.neo4jUri,
    neo4j.auth.basic(config.neo4jUser, config.neo4jPassword),
    {
      // Trust self-signed certs in local dev; in production use proper TLS.
      trust: "TRUST_ALL_CERTIFICATES",
    }
  );

  return driver;
}

/** Close the driver gracefully on shutdown. */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}