# Chapter 02 — Neo4j Driver

**Notes source:** `notes/03_Neo4j_Architecture_Deployment_LLM_Cypher.md`, `notes/04_Neo4j_NodeJS_Driver.md`

**Goal:** Create a singleton Neo4j driver so the whole app shares one connection pool, and close it gracefully on shutdown.

---

## 1. `src/db/driver.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/db/driver.ts` |
| Chapter | 02 (supports Chapters 03–07) |
| What it does | Singleton Neo4j driver + graceful shutdown (Chapter 04). |

### Full code

```ts
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
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `let driver: Driver \| null = null` | Holds the singleton driver instance. |
| `getDriver()` | Returns the existing driver or creates one on first call. |
| `neo4j.driver(...)` | Creates a driver using the Bolt URI and basic auth. |
| `trust: "trust_server_certificate"` | Trusts self-signed certs in local dev (not for production). |
| `closeDriver()` | Closes the driver and clears the singleton on shutdown. |

### Command

```bash
npm run typecheck
```