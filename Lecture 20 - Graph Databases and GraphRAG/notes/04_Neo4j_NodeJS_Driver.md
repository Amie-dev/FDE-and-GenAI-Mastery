# Chapter 04 — Neo4j Node.js Driver

## 4.1 Why a Singleton Driver?

A Node.js process should create **one** driver instance per database and reuse it throughout the lifetime of the app. Drivers encapsulate a connection pool; creating many instances leaks resources and adds operational complexity.

```typescript
// ❌ Bad: New driver per request
function handleRequest(...): void {
  const driver = neo4j.driver(neo4jUri, auth);  // Each call opens pool
  // ... use driver
}

// ✅ Good: Singleton pattern
class GraphService {
  private static instance: GraphService;
  private driver: any;

  private constructor() {
    this.driver = neo4j.driver(neo4jUri, auth);
  }

  static getDriver(): any {
    if (!GraphService.instance) {
      GraphService.instance = new GraphService();
    }
    return GraphService.instance.driver;
  }
}
```

## 4.2 API — Modern `executeQuery` vs Legacy `session`

Neo4j driver v5+ offers two APIs:

| Feature | `executeQuery` (v5+) | `session().run` (legacy) |
|---------|----------------------|---------------------------|
| Automatic session/pool management | ✅ | ❌ (manual) |
| Read/write transaction control | ❌ (one‑shot) | ✅ (`executeRead/executeWrite`) |
| Simple queries | ✅ Very ergonomic | ✅ Still supported |

### Example (executeQuery)

```typescript
import { neo4j } from 'neo4j-driver';

const driver = neo4j.driver(neo4jUri, auth);

const result = await driver.executeQuery(
  `MATCH (u:User {name: $name})-[:LIKES]->(h:Hotel)
    RETURN u.name AS user, h.name AS hotel`,
  { name: "Alice" },  // $name resolved here, not interpolated
  { database: "neo4j" }
);

const rows = result.records.map(r => r.toObject());
// rows = [{ user: "Alice", hotel: "Grand Plaza" }]
```

### Example (legacy session)

```typescript
const session = driver.session({ database: "neo4j" });
try {
  const result = await session.run(
    `MATCH (u:User {name: $name})-[:LIKES]->(h:Hotel) RETURN h.name`,
    { name: "Alice" }
  );
  // ... process records
} finally {
  await session.close();
}
```

## 4.3 Parameterized Queries — Prevent Injection

**Never** concatenate raw input into the Cypher string:

```typescript
// ❌ Injection risk
const query = `MATCH (u:User {name: "${userInput}"}) RETURN u;`;

// ✅ Safe: parameters resolved by driver
const query = `MATCH (u:User {name: $name}) RETURN u;`;
const params = { name: userInput };
```

Parameterized queries protect against Cypher injection, preserve execution plan cache, and allow the server to validate data types.

## 4.4 Graceful Shutdown

A clean process exit closes driver connection pools, freeing OS resources.

```typescript
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  await driver.close();
  process.exit(0);
}

process.once('SIGINT', gracefulShutdown);
process.once('SIGTERM', gracefulShutdown);
```

## 4.5 Safety: Non‑Mutating Default Role

For production services, create a low‑privilege role (e.g., `agent_readonly`) and bind the driver to it:

```bash
# In Docker:
neo4j.auth=neo4j/agent_password
# In Server config:
AUTHORIZED_ROLES: agent_readonly
```

## 4.6 J/S/TS Pseudo Code — Driver Singleton + Safe Query Helper

```typescript
// Pseudo code — realistic service layer
type DriverConfig = {
  uri: string;
  auth: any;  // neo4j.auth
  database?: string;
};

class Neo4jService {
  private static instance: Neo4jService;
  private driver: any;

  private constructor(config: DriverConfig) {
    this.driver = neo4j.driver(config.uri, config.auth, {\n    // disable driver desktop notifications
    });
  }

  static getInstance(config: DriverConfig): Neo4jService {
    if (!Neo4jService.instance) {
      Neo4jService.instance = new Neo4jService(config);
    }
    return Neo4jService.instance;
  }

  getDriver(): any {
    return this.driver;
  }

  // Safe query execution with optional parameters
  async runCypher<T = any>(
    cypher: string,
    params?: Record<string, unknown>
  ): Promise<T[]> {
    const query: QueryParams = {
      query: cypher,
      params: params ?? {},
    };

    try {
      const result = await this.driver.executeQuery(query);
      return result.records.map(r => r.toObject()) as T[];
    } catch (err) {
      // Normalize for caller
      console.error('Cypher execution failed:', err);
      throw err;
    }
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
    }
  }
}

// Example of usage:
const graph = Neo4jService.getInstance({
  uri: process.env.NEO4J_URI!,
  auth: neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
  database: "neo4j",
});

// Safe query execution (no injection possible):
await graph.runCypher<any>(`MATCH (u:User {name: $name}) RETURN u`, { name: "Alice" });
```

## 4.7 Common Mistakes

| Mistake | Why it hurts | Solution |
|---------|--------------|----------|
| New driver per request | Connection pool leaks, high memory | Singleton driver |
| `session.run` outside try/finally | Session may leak, connections stay open | Use `try…finally` or `await using` (Node 16+) |
| Unsafe string interpolation | Cypher injection vulnerability | Parameterized queries `$var` |
| No graceful shutdown | Connection backlog on kill | Register signal handlers to `driver.close()` |
| Using admin role for queries | Privilege escalation via LLM | Use read‑only role; run with restricted default DB |

## 4.8 Key Takeaways

- Create **one** driver per process and reuse it.
- Prefer `executeQuery` for simple queries; use sessions for explicit transaction control.
- Parameterise **all** user values via `$var` markers.
- Close driver on process exit; install signal handlers.
- Bind driver to a low‑privilege role for production safety.

---

**Self-check questions:**
11. Why must the `neo4j-driver` instance be a singleton in a Node.js process?
12. Show pseudo code for a safe, parameterised `executeQuery` call.
