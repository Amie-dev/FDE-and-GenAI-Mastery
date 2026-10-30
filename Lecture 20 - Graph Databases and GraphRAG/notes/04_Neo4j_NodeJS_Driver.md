# ⚡ 04 — Building Neo4j Applications with Node.js Driver

> **Goal:** Learn how to connect a Node.js application to Neo4j using the official `neo4j-driver`, execute parameterized Cypher queries, process records, manage transactions, and handle the driver lifecycle safely.

---

# 1. 📦 Installing the Official Neo4j Driver

For Node.js and JavaScript applications, Neo4j provides an official driver:

```bash
npm install neo4j-driver
```

The driver communicates with Neo4j using the **Bolt protocol**.

### Common connection URIs

| Environment | Example                              |
| ----------- | ------------------------------------ |
| Local Neo4j | `bolt://localhost:7687`              |
| Neo4j Aura  | `neo4j+s://xxxxx.databases.neo4j.io` |

### Mental model

```text
Node.js Application
       │
       │ neo4j-driver
       ▼
     Bolt
       │
       ▼
     Neo4j
```

The driver manages the connection pool and communication between your application and Neo4j.

---

# 2. 🔌 Connecting to Neo4j

The basic process is:

```text
1. Read connection configuration
        ↓
2. Create Driver
        ↓
3. Verify connection
        ↓
4. Execute queries
        ↓
5. Close Driver on application shutdown
```

### Conceptual Connection

```javascript
const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
const serverInfo = await driver.getServerInfo();
await driver.close();
```

### Important

Creating the driver does not mean every query has already been executed.

Think of the driver as your application's **Neo4j connection manager**.

```text
Application
     │
     ▼
  Driver
     │
     ├── Connection Pool
     │
     ├── Sessions
     │
     └── Queries / Transactions
```

---

# 3. 🧠 Driver vs Session vs Transaction

This distinction is extremely important.

### Driver

The **Driver** is the long-lived object used to communicate with Neo4j.

```javascript
const driver = neo4j.driver(...);
```

Usually, an application creates **one driver instance** and reuses it.

---

### Session

A **Session** represents a logical interaction with a particular Neo4j database.

```javascript
const session = driver.session({
  database: "neo4j"
});
```

Sessions should be closed after use.

```javascript
await session.close();
```

---

### Transaction

A **Transaction** groups one or more database operations into an atomic unit.

```text
Driver
  │
  └── Session
        │
        └── Transaction
              │
              ├── Query 1
              ├── Query 2
              └── Query 3
```

If the transaction succeeds:

```text
COMMIT
```

If it fails:

```text
ROLLBACK
```

---

# 4. ⚡ `driver.executeQuery()`

For many simple queries, the modern driver provides:

```javascript
driver.executeQuery()
```

This is convenient because you don't have to manually create and close a session for every simple query.

Example:

```javascript
const result = await driver.executeQuery(`
  MATCH (u:User)
  RETURN u.name AS name
`);
```

The result contains information such as:

```javascript
result.records
result.summary
```

---

# 5. 🛡️ Parameterized Queries — VERY IMPORTANT

One of the most important rules when working with Neo4j is:

> **Never build Cypher by directly concatenating user input.**

### ❌ Bad approach

```javascript
const query = `
  CREATE (u:User {
    name: '${userInput}'
  })
`;
```

### ✅ Correct approach

Use Cypher parameters:

```javascript
const query = `
  CREATE (u:User {
    name: $name,
    age: $age
  })
`;

const params = {
  name: "Alice",
  age: 30
};

await driver.executeQuery(query, params);
```

The important difference is:

```text
❌ Query text contains user data

CREATE (... name: 'Alice')

        ↓

✅ Query text contains parameter

CREATE (... name: $name)

        ↓

Data is supplied separately
```

### Benefits

Parameterized queries provide:

* 🛡️ Protection against injection
* ♻️ Reusable query structure
* 📖 Cleaner code
* ⚡ Better opportunities for query-plan reuse
* 🔍 Clear separation between query logic and data

---

# 6. 🔗 Creating Nodes and Relationships

Let's create a small graph.

```text
(Alice:User)
      │
      │ LIKES
      ↓
(Grand Plaza:Hotel)
```

Cypher:

```javascript
const query = `
  CREATE (u:User {
    name: $name,
    age: $age
  })

  CREATE (h:Hotel {
    businessName: $hotelName,
    city: $city,
    rating: $rating
  })

  CREATE (u)-[:LIKES]->(h)

  RETURN u, h
`;
```

This creates:

```text
(:User)
   │
   │ LIKES
   ↓
(:Hotel)
```

---

# 7. 🔄 Using `MERGE` for Match-or-Create

Instead of always creating new nodes, you may want to reuse an existing node.

For that, we can use:

```cypher
MERGE
```

### Conceptual Decision

```text
Does this pattern exist?
       │
    ┌──┴───┐
    │       │
   YES      NO
    │       │
   MATCH    CREATE
```

### ⚠️ Important

`MERGE` is useful for avoiding duplicate patterns, but it is **not a replacement for database uniqueness constraints**.

For important unique fields, use constraints.

```cypher
CREATE CONSTRAINT user_email_unique
FOR (u:User)
REQUIRE u.email IS UNIQUE;
```

---

# 8. 📊 Understanding Query Results

Consider:

```javascript
const result = await driver.executeQuery(`
  MATCH (u:User)-[:LIKES]->(h:Hotel)
  RETURN
    u.name AS userName,
    h.businessName AS hotelName,
    h.rating AS rating
`);
```

The result contains:

```javascript
result.records
```

Each record represents one returned row.

You can access values using:

```javascript
record.get("userName")
```

Example:

```javascript
result.records.forEach((record) => {
  console.log("User:", record.get("userName"));
  console.log("Hotel:", record.get("hotelName"));
  console.log("Rating:", record.get("rating"));
});
```

---

# 9. 📈 Query Summary and Counters

Neo4j also provides execution metadata through:

```javascript
result.summary
```

Example:

```javascript
const counters = result.summary.counters.updates();
console.log("Nodes created:", counters.nodesCreated);
console.log("Relationships created:", counters.relationshipsCreated);
```

You can also inspect timing information:

```javascript
result.summary.resultAvailableAfter
```

### Important distinction

`resultAvailableAfter` is the server-side time until results become available; it is **not necessarily the total end-to-end time experienced by your Node.js application**.

---

# 10. 🔁 Explicit Sessions and Transactions

For simple queries:

```javascript
driver.executeQuery(...)
```

is often enough.

But for more complex workflows, you may explicitly create a session.

```javascript
const session = driver.session({
  database: "neo4j"
});
```

Then use:

```javascript
session.executeWrite(...)
```

or:

```javascript
session.executeRead(...)
```

---

# 11. ✍️ `executeWrite()`

Use `executeWrite()` when performing transactional write operations.

```javascript
const session = driver.session({
  database: "neo4j"
});

try {
  await session.executeWrite(async (tx) => {
    await tx.run(`
      CREATE (u:User {
        email: $email
      })
    `, {
      email: "bob@example.com"
    });
  });

  console.log("✅ Transaction committed");
} catch (error) {
  console.error("❌ Transaction failed:", error);
} finally {
  await session.close();
}
```

### Mental model

```text
session.executeWrite()
        │
        ▼
    Transaction
        │
        ├── Query 1
        ├── Query 2
        ├── Query 3
        │
        ▼
   All succeed?
       │
    ┌──┴──┐
   YES    NO
    │      │
   COMMIT ROLLBACK
```

---

# 12. 📖 `executeRead()`

For transactional read operations:

```javascript
const users = await session.executeRead(
  async (tx) => {
    const result = await tx.run(`
      MATCH (u:User)
      RETURN u.name AS name
    `);

    return result.records;
  }
);
```

Then:

```javascript
users.forEach((record) => {
  console.log(record.get("name"));
});
```

---

# 13. 🔐 Why Transactions Matter

Suppose you are creating:

```text
User
 │
 ├── OWNS → Account
 │
 └── HAS → Profile
```

You may need several database operations.

Without a transaction:

```text
Create User       ✅
Create Account    ✅
Create Profile    ❌

Database = partially updated
```

With a transaction:

```text
Create User       ✅
Create Account    ✅
Create Profile    ❌
       │
       ▼
   ROLLBACK
       │
       ▼
No partial transaction changes
```

This helps maintain **atomicity**.

---

# 14. 🧹 Driver and Session Lifecycle

A common mistake is creating resources and forgetting to close them.

### Session

If you explicitly create:

```javascript
const session = driver.session();
```

close it:

```javascript
await session.close();
```

### Driver

When the application shuts down:

```javascript
await driver.close();
```

The driver owns connection pools, so it should normally be created once and reused rather than created for every request.

---

# 15. 🏗️ Recommended Application Architecture

For an Express/Node.js backend, avoid this pattern:

```text
HTTP Request
    │
    ▼
Create Driver
    │
    ▼
Run Query
    │
    ▼
Close Driver
```

for every request.

Instead:

```text
Application Startup
       │
       ▼
Create ONE Driver
       │
       ▼
Connection Pool
       │
       ├── Request 1
       ├── Request 2
       ├── Request 3
       └── Request N
       │
       ▼
Application Shutdown
       │
       ▼
Close Driver
```

### Example structure

```text
src/
│
├── config/
│   └── neo4j.js
│
├── repositories/
│   └── user.repository.js
│
├── services/
│   └── user.service.js
│
├── routes/
│   └── user.routes.js
│
└── server.js
```

---

# 16. 🧩 Creating a Reusable Neo4j Driver

```javascript
// config/neo4j.js

const neo4j = require("neo4j-driver");

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(
    process.env.NEO4J_USER,
    process.env.NEO4J_PASSWORD
  )
);

module.exports = driver;
```

Then use it elsewhere:

```javascript
const driver = require("./config/neo4j");

async function getUsers() {
  const result = await driver.executeQuery(`
    MATCH (u:User)
    RETURN u
  `);

  return result.records;
}
```

This gives your application a centralized Neo4j connection manager.

---

# 17. 🌐 Complete End-to-End Example

```javascript
const neo4j = require("neo4j-driver");

async function runGraphDemo() {
  const URI = process.env.NEO4J_URI || "bolt://localhost:7687";
  const USER = process.env.NEO4J_USER || "neo4j";
  const PASSWORD = process.env.NEO4J_PASSWORD || "password123";

  const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));

  try {
    const serverInfo = await driver.getServerInfo();
    console.log("Connected to:", serverInfo.address);

    const createQuery = `
      MERGE (u:User {name: $userName})
      ON CREATE SET u.age = $age
      MERGE (h:Hotel {businessName: $hotelName})
      ON CREATE SET
        h.city = $city,
        h.rating = $rating
      MERGE (u)-[:LIKES]->(h)
      RETURN u, h
    `;

    const createResult = await driver.executeQuery(createQuery, {
      userName: "Alice",
      age: 30,
      hotelName: "Grand Plaza",
      city: "Paris",
      rating: 4.9
    });

    const counters = createResult.summary.counters.updates();

    console.log("Nodes created:", counters.nodesCreated);
    console.log("Relationships created:", counters.relationshipsCreated);

    const matchQuery = `
      MATCH
        (u:User {name: $userName})
        -[:LIKES]->
        (h:Hotel)

      RETURN
        u.name AS userName,
        h.businessName AS hotelName,
        h.city AS city,
        h.rating AS rating
    `;

    const matchResult = await driver.executeQuery(matchQuery, {
      userName: "Alice"
    });

    matchResult.records.forEach((record) => {
      console.log(`User: ${record.get("userName")}`);
      console.log(`Hotel: ${record.get("hotelName")}`);
    });
  } catch (error) {
    console.error("Neo4j error:", error);
  } finally {
    await driver.close();
  }
}
```

---

# 18. ⚠️ Common Mistakes

## Mistake 1 — Creating a new driver for every request

### ❌ Avoid:

```javascript
app.get("/users", async (req, res) => {
  const driver = neo4j.driver(...);
  // query
  await driver.close();
});
```

Prefer a shared application-level driver.

---

## Mistake 2 — Forgetting to close sessions

### ❌

```javascript
const session = driver.session();
// queries...
```

### ✅ Use `try/finally`:

```javascript
const session = driver.session();

try {
  // work
} finally {
  await session.close();
}
```

---

## Mistake 3 — String concatenation

### ❌

```javascript
const query = `
  MATCH (u:User {name: '${name}'})
  RETURN u
`;
```

### ✅

```javascript
const query = `
  MATCH (u:User {name: $name})
  RETURN u
`;

const params = { name };
```

---

## Mistake 4 — Hardcoding production credentials

### ❌

```javascript
const PASSWORD = "password123";
```

Use environment variables:

```env
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-secret
```

Then:

```javascript
process.env.NEO4J_PASSWORD
```

Never commit secrets to Git.

---

## Mistake 5 — Using `MERGE` without thinking about uniqueness

`MERGE (u:User {name: $name})` doesn't automatically mean your data model has a proper uniqueness guarantee.

For identity fields such as email:

```cypher
CREATE CONSTRAINT user_email_unique
FOR (u:User)
REQUIRE u.email IS UNIQUE;
```

---

# 19. 🧠 `executeQuery()` vs Explicit Sessions

| Situation                     | Recommended              |
| ----------------------------- | ------------------------ |
| Simple query                  | `driver.executeQuery()`  |
| Simple write                  | `driver.executeQuery()`  |
| Simple read                   | `driver.executeQuery()`  |
| Multi-step transaction        | `session.executeWrite()` |
| Transactional read            | `session.executeRead()`  |
| Need explicit session control | `driver.session()`       |
| Application shutdown          | `driver.close()`         |

### Simple mental model

```text
Simple query
      │
      ▼
executeQuery()
```

```text
Complex transactional workflow
      │
      ▼
Session
      │
      ├── executeRead()
      │
      └── executeWrite()
```

---

# 20. 🤖 Neo4j Driver + AI Applications

The Node.js Neo4j driver becomes especially useful when building **GraphRAG and AI agents**.

A typical architecture can look like:

```text
User Question
      │
      ▼
   LLM / Agent
      │
      │ Generate Cypher
      ▼
Cypher Validation
      │
      ▼
Neo4j Driver
      │
      ▼
Neo4j Graph
      │
      ▼
Graph Results
      │
      ▼
   LLM
      │
      ▼
Final Answer
```

### Important security rule

Never blindly execute arbitrary Cypher generated by an LLM.

A safer pipeline is:

```text
LLM-generated Cypher
        │
        ▼
Validate / Restrict
        │
        ├── Allowed operation?
        ├── Allowed labels?
        ├── Allowed properties?
        ├── Read-only?
        └── Valid parameters?
        │
        ▼
Neo4j Driver
        │
        ▼
Neo4j
```

For read-only AI applications, consider using a database user with restricted permissions.

---

# 21. 🔥 Complete Mental Model

Remember these four layers:

```text
┌─────────────────────────────┐
│      Node.js Application    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Neo4j Driver          │
│                             │
│  Connection Pool            │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Session / Query        │
│                             │
│ executeQuery()              │
│ executeRead()               │
│ executeWrite()              │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          Neo4j              │
│                             │
│ Nodes + Relationships       │
│ Properties + Constraints    │
└─────────────────────────────┘
```

---

# 22. 🎯 Developer Checklist

Before considering your Neo4j Node.js integration production-ready:

* [ ] Install official `neo4j-driver`
* [ ] Create a shared Driver instance
* [ ] Store credentials in environment variables
* [ ] Use parameterized Cypher
* [ ] Never concatenate untrusted input into Cypher
* [ ] Use `executeQuery()` for straightforward queries
* [ ] Use explicit sessions for transactional workflows
* [ ] Use `executeWrite()` for transactional writes
* [ ] Use `executeRead()` for transactional reads
* [ ] Close sessions with `session.close()`
* [ ] Close the driver during application shutdown
* [ ] Use constraints for important uniqueness requirements
* [ ] Validate/restrict LLM-generated Cypher
* [ ] Use least-privilege database credentials

---

# 🧾 Interview Quick Revision

### Q1. What is `neo4j-driver`?

The official Node.js/JavaScript driver used to communicate with Neo4j databases.

---

### Q2. What protocol does it commonly use?

**Bolt**.

---

### Q3. Why use parameterized Cypher?

To separate query structure from data, reduce injection risk, and allow Neo4j to reuse query plans more effectively.

---

### Q4. What is the difference between Driver and Session?

**Driver** is the long-lived database connectivity object and manages connection pooling.

**Session** represents a logical interaction with a database and should be closed after use.

---

### Q5. When should you use `executeQuery()`?

For straightforward individual queries where you don't need explicit session/transaction handling.

---

### Q6. When should you use `executeWrite()`?

When you need a transactional write workflow involving one or more operations.

---

### Q7. What happens when a transaction fails?

The transaction is rolled back, so its changes are not committed as a successful unit.

---

### Q8. Why shouldn't you create a Driver for every HTTP request?

Because the Driver manages connection resources and pooling. Creating and destroying it repeatedly adds unnecessary overhead.

---

### Q9. How do you safely pass user input?

Using parameters:

```cypher
MATCH (u:User {email: $email})
RETURN u
```

```javascript
{
  email: userEmail
}
```

---

### Q10. What should you do when the Node.js application shuts down?

Gracefully close the Driver:

```javascript
await driver.close();
```

---

# 🧠 One-Line Mental Model

> **Driver manages connectivity → Session manages interaction → Transaction provides atomic work → Cypher operates on the graph → Records return the data.**

And for production:

> **One shared Driver + parameterized Cypher + explicit transactions when needed + proper lifecycle management + least-privilege access.**
