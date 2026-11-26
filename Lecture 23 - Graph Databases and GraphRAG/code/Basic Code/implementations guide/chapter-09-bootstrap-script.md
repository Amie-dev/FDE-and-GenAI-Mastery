# Chapter 09 — Bootstrap Script

**Notes source:** `notes/08_End_to_End_Cognitive_Memory_App.md`

**Goal:** Run schema + seed Cypher files against Neo4j to set up constraints, indexes, and sample data.

---

## 1. `src/scripts/bootstrap.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/scripts/bootstrap.ts` |
| Chapter | 09 |
| What it does | Reads `schema.cypher` and `seed.cypher`, executes each statement against Neo4j. |

### Full code

```ts
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
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `readFileSync` | Reads the Cypher files from disk. |
| `driver.session(...)` | Opens a Neo4j session for running writes. |
| `split(";")` | Splits the file into individual Cypher statements. |
| `session.run(stmt)` | Executes each statement against Neo4j. |
| `finally` | Always closes the session and driver, even on error. |
| `require.main === module` | Runs bootstrap only when executed directly (not imported). |

### Command

```bash
npm run bootstrap
```

### Self-check

1. Why use `IF NOT EXISTS` in schema statements? → idempotent bootstrap (safe to re-run).