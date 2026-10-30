# 📜 02 — Cypher Query Language: Syntax & Patterns

> **Goal:** Learn the basics of Cypher, understand graph patterns, and perform CRUD operations, filtering, aggregation, and multi-hop traversal in Neo4j.

---

# 1. 🔤 What is Cypher?

**Cypher** is a declarative query language designed for working with graph databases, especially **Neo4j**.

If SQL works mainly with:

```text
Tables → Rows → JOINs
```

Cypher works with:

```text
Nodes → Relationships → Patterns
```

The biggest advantage of Cypher is that graph relationships can be written in a visual, ASCII-like form.

### Basic Cypher Pattern

```text
(User) -[:KNOWS]-> (User)
```

For example:

```text
(Alice) -[:KNOWS]-> (Jane)
```

This reads almost like English:

> Alice knows Jane.

---

# 2. 🧩 Cypher Pattern Syntax

The most important thing to remember:

```text
()     → Node
[]     → Relationship
-->    → Direction
{}     → Properties
:      → Label or Relationship Type
```

---

## A. 🟢 Node Syntax

### Anonymous Node

```cypher
()
```

Means:

> Any node.

---

### Node with a Variable

```cypher
(u)
```

`u` is the variable name.

You can use it later:

```cypher
RETURN u
```

---

### Node with a Label

```cypher
(u:User)
```

Means:

> Find a node labeled `User`.

---

### Node with Properties

```cypher
(u:User {
    name: "Alice",
    age: 30
})
```

Means:

> Find a `User` whose name is Alice and age is 30.

---

# 3. 🔗 Relationship Syntax

Relationships are written inside square brackets.

### Any Relationship

```cypher
()-[]-()
```

---

### Directed Relationship

```cypher
()-[]->()
```

Direction:

```text
Node A → Node B
```

---

### Reverse Direction

```cypher
()<-[]-()
```

Direction:

```text
Node A ← Node B
```

---

### Relationship Type

```cypher
()-[:KNOWS]->()
```

Means:

> A node has a `KNOWS` relationship with another node.

---

### Relationship with a Variable

```cypher
()-[r:KNOWS]->()
```

Now the relationship is stored in variable `r`.

You can access it:

```cypher
RETURN r
```

---

### Relationship with Properties

```cypher
()-[:KNOWS {since: 2024}]->()
```

This relationship contains a property:

```text
since = 2024
```

---

# 4. 🧠 Complete Graph Pattern

A complete Cypher pattern might look like:

```cypher
(u:User {name: "Alice"})
    -[:LIKES]->
(h:Hotel {name: "Grand Plaza"})
```

Visual representation:

```text
┌───────────────┐
│ User: Alice   │
└───────┬───────┘
        │
      LIKES
        │
        ↓
┌──────────────────┐
│ Hotel: Grand Plaza│
└──────────────────┘
```

This is the core idea behind Cypher:

> **Describe the graph pattern you want.**

---

# 5. 🛠️ CRUD Operations in Cypher

CRUD means:

```text
C → Create
R → Read
U → Update
D → Delete
```

In Cypher, the main commands are:

```text
CREATE
MATCH
MERGE
SET
REMOVE
DELETE
DETACH DELETE
```

---

# 6. 🟢 CREATE — Create Data

## Create a Node

```cypher
CREATE (u:User {
    name: "Alice",
    age: 30,
    city: "New York"
});
```

This creates:

```text
(:User {
    name: "Alice",
    age: 30,
    city: "New York"
})
```

---

## Create Another Node

```cypher
CREATE (h:Hotel {
    name: "Grand Plaza",
    rating: 4.8
});
```

---

## Create Node + Relationship Together

```cypher
CREATE (u:User {name: "Alice"})
       -[:LIKES {rating: 5}]->
       (h:Hotel {name: "Grand Plaza"});
```

This creates everything in one pattern:

```text
Alice
  │
  │ LIKES
  │ rating: 5
  ↓
Grand Plaza
```

---

# 7. 🔗 Connecting Existing Nodes

Sometimes the nodes already exist.

First find them:

```cypher
MATCH (u:User {name: "Alice"})
MATCH (h:Hotel {name: "Grand Plaza"})
```

Then create the relationship:

```cypher
CREATE (u)-[:LIKES]->(h);
```

Complete query:

```cypher
MATCH (u:User {name: "Alice"})
MATCH (h:Hotel {name: "Grand Plaza"})
CREATE (u)-[:LIKES {visitedDate: "2026-05-12"}]->(h);
```

---

# 8. 🔍 MATCH — Find Data

`MATCH` is one of the most important Cypher commands.

It is similar to:

```sql
SELECT
```

in SQL.

---

## Find a User

```cypher
MATCH (u:User {name: "Alice"})
RETURN u;
```

Meaning:

> Find the User named Alice and return her.

---

## Find All Users

```cypher
MATCH (u:User)
RETURN u;
```

---

## Find Hotels Alice Likes

```cypher
MATCH (u:User {name: "Alice"})
      -[:LIKES]->
      (h:Hotel)

RETURN h;
```

---

## Return Specific Properties

```cypher
MATCH (u:User {name: "Alice"})
      -[:LIKES]->
      (h:Hotel)

RETURN h.name, h.rating;
```

---

# 9. 📦 RETURN — Choose What to Output

`RETURN` determines what data comes back from the query.

Example:

```cypher
MATCH (u:User)
RETURN u;
```

Return only the name:

```cypher
MATCH (u:User)
RETURN u.name;
```

Rename the output using `AS`:

```cypher
MATCH (u:User)
RETURN u.name AS UserName;
```

---

# 10. 🔄 MERGE — Match or Create

`MERGE` is similar to an **upsert-style operation**.

It tries to find the specified pattern.

If it exists:

```text
MATCH
```

If it doesn't exist:

```text
CREATE
```

Example:

```cypher
MERGE (u:User {
    email: "alice@example.com"
})
RETURN u;
```

---

## ON CREATE

Run something only when the node is newly created:

```cypher
MERGE (u:User {
    email: "alice@example.com"
})

ON CREATE SET
    u.name = "Alice",
    u.createdAt = timestamp()

RETURN u;
```

---

## ON MATCH

Run something when the node already exists:

```cypher
MERGE (u:User {
    email: "alice@example.com"
})

ON MATCH SET
    u.lastLogin = timestamp()

RETURN u;
```

---

## MERGE Relationship

```cypher
MATCH (a:User {name: "Alice"})
MATCH (b:User {name: "Jane"})

MERGE (a)-[r:KNOWS]->(b)

ON CREATE SET
    r.since = 2026;
```

This is useful when you don't want to accidentally create the same relationship repeatedly.

> **Important:** `MERGE` does not replace proper database constraints for enforcing uniqueness. For important identifiers such as email addresses, use a **uniqueness constraint** as well.

---

# 11. ✏️ SET — Update Data

Use `SET` to modify properties.

```cypher
MATCH (u:User {name: "Alice"})

SET u.age = 31

RETURN u;
```

---

## Update Multiple Properties

```cypher
MATCH (u:User {name: "Alice"})

SET
    u.age = 31,
    u.vip = true

RETURN u;
```

---

## Add a Label

```cypher
MATCH (u:User {name: "Alice"})

SET u:PremiumUser

RETURN u;
```

Now Alice has:

```text
:User
:PremiumUser
```

---

# 12. 🗑️ REMOVE — Remove Properties or Labels

Remove a property:

```cypher
MATCH (u:User {name: "Alice"})

REMOVE u.vip

RETURN u;
```

Remove a label:

```cypher
MATCH (u:User {name: "Alice"})

REMOVE u:PremiumUser

RETURN u;
```

---

# 13. ❌ DELETE — Delete Data

To delete a node:

```cypher
MATCH (u:User {name: "Alice"})
DELETE u;
```

However, if Alice still has relationships, Neo4j will not allow the deletion.

For example:

```text
Alice
 ├── KNOWS → Jane
 └── LIKES → Hotel
```

You cannot simply delete Alice while those relationships remain.

---

# 14. 💥 DETACH DELETE

`DETACH DELETE` removes:

```text
Node
+
All relationships connected to that node
```

Example:

```cypher
MATCH (u:User {name: "Alice"})
DETACH DELETE u;
```

Graph:

```text
Before:

Alice ──KNOWS──> Jane
  │
  └──LIKES──> Hotel


After:

Jane

Hotel
```

> **Be careful:** `DETACH DELETE` can remove many relationships. Use it carefully, especially in production.

---

# 15. 🔎 WHERE — Filtering Results

`WHERE` allows you to filter matched data.

Example:

```cypher
MATCH (u:User)

WHERE u.age > 25

RETURN u;
```

---

## Multiple Conditions

```cypher
MATCH (u:User)-[:LIKES]->(h:Hotel)

WHERE u.age > 25
  AND h.rating >= 4.5

RETURN u.name, h.name;
```

---

## String Filtering

```cypher
MATCH (h:Hotel)

WHERE h.name STARTS WITH "Grand"

RETURN h;
```

Other useful operators include:

```text
=
<>
>
<
>=
<=
IN
CONTAINS
STARTS WITH
ENDS WITH
```

---

# 16. 📊 Aggregation

Cypher supports common aggregation functions.

Important ones:

```text
count()
collect()
avg()
sum()
min()
max()
```

---

## Count

How many hotels does each user like?

```cypher
MATCH (u:User)-[:LIKES]->(h:Hotel)

RETURN
    u.name AS UserName,
    count(h) AS TotalHotels;
```

Example result:

```text
Alice → 5
Jane  → 3
Bob   → 7
```

---

## Collect

Collect all hotel names:

```cypher
MATCH (u:User)-[:LIKES]->(h:Hotel)

RETURN
    u.name,
    collect(h.name) AS Hotels;
```

Result:

```text
Alice → ["Grand Plaza", "Hilton", "Marriott"]
```

---

# 17. 🕸️ Multi-Hop Traversal

One of the most powerful features of graph databases is traversing multiple relationships.

Suppose:

```text
Alice
  ↓ KNOWS
Jane
  ↓ KNOWS
Bob
  ↓ KNOWS
Tom
```

We can search multiple hops.

---

## Variable-Length Relationship

```cypher
MATCH (u:User {name: "Alice"})
      -[:KNOWS*1..3]->
      (f:User)

RETURN f.name;
```

Meaning:

```text
1 hop → Alice → Jane

2 hops → Alice → Jane → Bob

3 hops → Alice → Jane → Bob → Tom
```

---

## Get Distance

```cypher
MATCH path =
    (u:User {name: "Alice"})
    -[:KNOWS*1..3]->
    (f:User)

RETURN
    f.name,
    length(path) AS Distance;
```

Example:

```text
Jane → 1
Bob  → 2
Tom  → 3
```

---

# 18. 🧭 Direction Matters

Suppose we have:

```text
Alice ──KNOWS──> Jane
```

This query:

```cypher
MATCH (a)-[:KNOWS]->(b)
```

looks for:

```text
a → b
```

This query:

```cypher
MATCH (a)<-[:KNOWS]-(b)
```

looks for:

```text
b → a
```

And:

```cypher
MATCH (a)-[:KNOWS]-(b)
```

matches the relationship regardless of direction.

> **Note:** A relationship in Neo4j has a direction, but some queries can intentionally ignore that direction.

---

# 19. ⚔️ SQL vs Cypher

The same graph operation can look very different in SQL and Cypher.

### Find a User

**SQL:**

```sql
SELECT *
FROM users
WHERE name = 'Alice';
```

**Cypher:**

```cypher
MATCH (u:User {name: "Alice"})
RETURN u;
```

---

### Find Alice's Friends

**SQL:**

```sql
SELECT u2.*
FROM users u1
JOIN relationships r
    ON u1.id = r.from_id
JOIN users u2
    ON r.to_id = u2.id
WHERE u1.name = 'Alice'
  AND r.type = 'KNOWS';
```

**Cypher:**

```cypher
MATCH (:User {name: "Alice"})
      -[:KNOWS]->
      (friend:User)

RETURN friend;
```

---

### Hotels Liked by Alice's Friends

**Cypher:**

```cypher
MATCH (:User {name: "Alice"})
      -[:KNOWS]->
      (:User)
      -[:LIKES]->
      (h:Hotel)

RETURN h;
```

The graph pattern directly shows:

```text
Alice
 ↓ KNOWS
Friend
 ↓ LIKES
Hotel
```

---

# 20. 🤖 Cypher + AI Agents

Cypher is especially interesting for AI applications.

An AI agent can receive a natural-language question such as:

> "Which hotels are liked by people Alice knows?"

The intended graph pattern is:

```text
Alice
 ↓ KNOWS
People
 ↓ LIKES
Hotels
```

Which can become:

```cypher
MATCH (:User {name: "Alice"})
      -[:KNOWS]->
      (:User)
      -[:LIKES]->
      (h:Hotel)

RETURN h;
```

This makes Cypher useful for:

* AI agents
* Knowledge graphs
* Graph RAG
* Recommendation systems
* Entity relationship queries
* Agent memory

> **Important:** An LLM-generated Cypher query should still be validated, constrained, and tested before execution. Natural-language-to-Cypher generation is useful, but it is not guaranteed to be correct.

---

# 21. 🧠 Cypher Cheat Sheet

Keep this table in your memory:

| Syntax            | Meaning                     |
| ----------------- | --------------------------- |
| `()`              | Node                        |
| `(u)`             | Node variable               |
| `:User`           | Node label                  |
| `{name: "Alice"}` | Properties                  |
| `[]`              | Relationship                |
| `[:KNOWS]`        | Relationship type           |
| `[r:KNOWS]`       | Relationship variable       |
| `-->`             | Directed relationship       |
| `<--`             | Reverse direction           |
| `--`              | Undirected pattern          |
| `CREATE`          | Create data                 |
| `MATCH`           | Find data                   |
| `RETURN`          | Return data                 |
| `MERGE`           | Match or create             |
| `SET`             | Update/add properties       |
| `REMOVE`          | Remove properties/labels    |
| `DELETE`          | Delete node/relationship    |
| `DETACH DELETE`   | Delete node + relationships |
| `WHERE`           | Filter                      |
| `count()`         | Count                       |
| `collect()`       | Create a list               |
| `avg()`           | Average                     |

---

# 🎯 Key Takeaways

### 1. Remember the basic pattern

```text
(Node)-[Relationship]->(Node)
```

---

### 2. Remember the symbols

```text
()  → Node
[]  → Relationship
{}  → Properties
:   → Label / Relationship Type
--> → Direction
```

---

### 3. Remember the main commands

```text
CREATE → Create
MATCH  → Find
MERGE  → Match/Create
SET    → Update
REMOVE → Remove
DELETE → Delete
```

---

### 4. `WHERE` filters data

```cypher
MATCH (u:User)
WHERE u.age > 25
RETURN u;
```

---

### 5. Graph traversal is one of Cypher's biggest strengths

```cypher
MATCH (a)-[:KNOWS*1..3]->(b)
RETURN b;
```

This lets you explore:

```text
1 hop
2 hops
3 hops
```

---

### 6. Cypher describes relationships naturally

Instead of thinking:

```text
JOIN table A
JOIN table B
JOIN table C
```

you can think:

```text
Alice
 ↓ KNOWS
Friend
 ↓ LIKES
Hotel
```

and write almost exactly that pattern in Cypher.

---

# 🧠 One-Line Mental Model

> **SQL describes data in tables. Cypher describes data as connected patterns.**

The most important Cypher pattern to remember is:

```text
(Node)-[Relationship]->(Node)
```

Once you understand this pattern, `MATCH`, `CREATE`, `MERGE`, `WHERE`, and multi-hop traversal become much easier to learn.
