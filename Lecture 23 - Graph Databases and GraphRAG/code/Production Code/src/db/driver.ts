import neo4j, { Driver } from "neo4j-driver";
import { config } from "../config/config";

/**
 * Singleton Neo4j driver with graceful shutdown support.
 * One Driver instance per process. Owns the connection pool.
 */
let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      config.NEO4J_URI,
      neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD),
      {
        // Production TLS should use proper certs; TRUST_ALL_CERTIFICATES is dev-only.
        trust: config.NODE_ENV === "production"
          ? "TRUST_SYSTEM_CA_SIGNED_CERTIFICATES"
          : "TRUST_ALL_CERTIFICATES",
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 5000,
      }
    );
  }
  return driver;
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

export function getSession() {
  return getDriver().session({ database: config.NEO4J_DATABASE });
}