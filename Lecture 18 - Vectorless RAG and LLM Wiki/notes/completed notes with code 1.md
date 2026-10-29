# 📖 Vectorless RAG — Complete Code Implementation Walkthrough

This document explains the **entire implementation of `vectorless-rag-01` from the code perspective**.

The goal is simple: **open this document alongside the source code and understand what every file, class, method, and execution flow is doing.**

This guide intentionally focuses on **implementation and code flow**, not RAG theory.

---

# 1. Project Structure

```text
vectorless-rag-01/
│
├── package.json
├── .env.example
├── implementation.md
│
└── src/
    │
    ├── config.js
    ├── index.js
    ├── cli.js
    │
    ├── tree/
    │   ├── TreeNode.js
    │   ├── HierarchicalTreeIndex.js
    │   └── TreeBuilder.js
    │
    ├── search/
    │   ├── SummaryPruner.js
    │   └── AgenticTreeSearchEngine.js
    │
    ├── wiki/
    │   ├── WikiVault.js
    │   ├── LLMLibrarian.js
    │   └── TwoPassRetriever.js
    │
    └── comparison/
        └── VectorVsVectorlessBenchmark.js
```

The implementation can be understood in this order:

```text
config.js
   ↓
TreeNode.js
   ↓
TreeBuilder.js
   ↓
HierarchicalTreeIndex.js
   ↓
SummaryPruner.js
   ↓
AgenticTreeSearchEngine.js
   ↓
WikiVault.js
   ↓
TwoPassRetriever.js
   ↓
Benchmark
   ↓
CLI / index.js
```

---

# 2. `src/config.js`

## Purpose

`config.js` is the central configuration module.

Instead of reading environment variables throughout the application, every other module can import the same `config` object.

Typical configuration values include:

```javascript
export const config = {
  env: process.env.NODE_ENV || "development",

  maxTreeDepth:
    Number(process.env.DEFAULT_MAX_TREE_DEPTH) || 3,

  pruningThreshold:
    Number(process.env.SUMMARY_PRUNING_THRESHOLD) || 1.5,
};
```

---

## `process.env`

Node.js exposes environment variables through:

```javascript
process.env
```

For example:

```env
DEFAULT_MAX_TREE_DEPTH=3
SUMMARY_PRUNING_THRESHOLD=1.5
```

can be accessed using:

```javascript
process.env.DEFAULT_MAX_TREE_DEPTH
```

Environment values are strings, so the code converts numeric values:

```javascript
Number(process.env.DEFAULT_MAX_TREE_DEPTH)
```

---

## Default values

The `||` operator provides fallback values:

```javascript
Number(process.env.DEFAULT_MAX_TREE_DEPTH) || 3
```

So if the environment variable doesn't exist, the application uses:

```text
3
```

This prevents the application from breaking because of missing configuration.

---

# 3. `src/tree/TreeNode.js`

This is one of the most important files.

It defines the basic data structure used by the entire tree-search implementation.

---

## `TreeNode` class

A node represents one location in the document hierarchy.

Conceptually:

```text
Document
 ├── Chapter
 │    ├── Section
 │    └── Section
 └── Chapter
```

Each item above is represented by a `TreeNode`.

A typical constructor looks like:

```javascript
class TreeNode {
  constructor({
    nodeId,
    title,
    level,
    pageRange,
    summary,
    keywords = [],
    entities = [],
    content = null,
  }) {
    this.nodeId = nodeId;
    this.title = title;
    this.level = level;
    this.pageRange = pageRange;
    this.summary = summary;
    this.keywords = keywords;
    this.entities = entities;

    this.children = [];
    this.parent = null;

    this.content = content;
  }
}
```

---

# 4. Understanding Each `TreeNode` Property

## `nodeId`

```javascript
this.nodeId = nodeId;
```

Unique identifier for the node.

Example:

```text
root
ch_1
ch_2
sec_2_1
sec_2_2
```

This ID is later used to find nodes quickly.

---

## `title`

```javascript
this.title = title;
```

Human-readable name.

Example:

```text
Chapter 2: Load Balancing
```

---

## `level`

```javascript
this.level = level;
```

Represents the depth of the node.

Example:

```text
0 → root
1 → chapter
2 → section
3 → subsection
```

---

## `pageRange`

```javascript
this.pageRange = pageRange;
```

Stores the document location.

Example:

```javascript
[161, 250]
```

means pages 161–250.

---

## `summary`

```javascript
this.summary = summary;
```

Stores a compact description of what the node contains.

Example:

```text
Explains session persistence and sticky-session
strategies for distributed load balancers.
```

The search layer uses this information instead of loading the entire document.

---

## `keywords`

```javascript
this.keywords = keywords;
```

Example:

```javascript
[
  "sticky sessions",
  "session persistence",
  "load balancing"
]
```

---

## `entities`

```javascript
this.entities = entities;
```

Stores important named concepts or entities associated with the section.

---

## `children`

```javascript
this.children = [];
```

Stores child nodes.

For example:

```text
ch_2
 ├── sec_2_1
 └── sec_2_2
```

Internally:

```javascript
ch2.children = [
  sec21,
  sec22
];
```

---

## `parent`

```javascript
this.parent = null;
```

Stores a reference to the parent node.

When a child is added, this value is updated.

This allows the application to move **upward** through the tree later.

---

## `content`

```javascript
this.content = content;
```

Stores the actual raw section text.

It can remain:

```javascript
null
```

until the search reaches the required section.

---

# 5. `addChild()`

The node needs a method for creating parent-child relationships.

```javascript
addChild(childNode) {
  childNode.parent = this;
  this.children.push(childNode);
}
```

Suppose:

```javascript
chapter2.addChild(section22);
```

Two things happen.

First:

```javascript
section22.parent = chapter2;
```

Then:

```javascript
chapter2.children.push(section22);
```

The relationship becomes:

```text
chapter2
   ↓
section22
```

And `section22` can also navigate back:

```text
section22
   ↑
chapter2
```

---

# 6. `isLeaf()`

```javascript
isLeaf() {
  return this.children.length === 0;
}
```

A leaf node is simply a node without children.

Example:

```text
Chapter 2
 ├── Section 2.1
 └── Section 2.2
       ↓
     Leaf
```

For `sec_2_2`:

```javascript
sec22.isLeaf()
```

returns:

```javascript
true
```

---

# 7. `toMetadataJSON()`

This method converts a node into a lightweight object.

Example:

```javascript
toMetadataJSON(includeContent = false) {
  return {
    nodeId: this.nodeId,
    title: this.title,
    level: this.level,
    pageRange: this.pageRange,
    summary: this.summary,
    keywords: this.keywords,
    entities: this.entities,
    childrenCount: this.children.length,

    ...(includeContent && {
      content: this.content,
    }),
  };
}
```

The important part is:

```javascript
includeContent
```

If:

```javascript
includeContent = false
```

the raw content isn't included.

If:

```javascript
includeContent = true
```

then:

```javascript
content: this.content
```

is added.

This keeps metadata lightweight.

---

# 8. `src/tree/TreeBuilder.js`

`TreeBuilder.js` creates the actual document tree.

Instead of manually constructing the tree everywhere, the application uses a dedicated builder.

---

## Creating the root

Example:

```javascript
const root = new TreeNode({
  nodeId: "root",
  title: "Distributed Systems Architecture Manual",
  level: 0,
  pageRange: [1, 500],
  summary: "Complete distributed systems architecture manual",
});
```

---

## Creating Chapter 2

```javascript
const chapter2 = new TreeNode({
  nodeId: "ch_2",
  title: "Load Balancing & Traffic Distribution",
  level: 1,
  pageRange: [121, 250],
  summary: "Load balancing, traffic distribution and session persistence",
});
```

---

## Creating Section 2.2

```javascript
const section22 = new TreeNode({
  nodeId: "sec_2_2",
  title: "Session Persistence & Sticky Sessions",
  level: 2,
  pageRange: [161, 250],
  summary:
    "Explains sticky sessions and session persistence strategies.",
  keywords: [
    "sticky sessions",
    "session persistence",
    "failover",
  ],
});
```

---

## Connecting nodes

The builder then connects them:

```javascript
root.addChild(chapter2);
chapter2.addChild(section22);
```

The resulting structure is:

```text
root
 └── ch_2
      └── sec_2_2
```

Because `addChild()` also assigns the parent, the complete relationship exists in both directions.

---

# 9. `src/tree/HierarchicalTreeIndex.js`

`HierarchicalTreeIndex` manages the entire tree.

The `TreeNode` represents **one node**.

The `HierarchicalTreeIndex` represents **the complete tree**.

---

## Constructor

A typical implementation initializes:

```javascript
class HierarchicalTreeIndex {
  constructor(root) {
    this.root = root;
    this.indexMap = new Map();

    this._indexSubtree(root);
  }
}
```

The important structure is:

```javascript
Map<string, TreeNode>
```

---

# 10. `_indexSubtree()`

This method recursively walks through every node.

```javascript
_indexSubtree(node) {
  this.indexMap.set(node.nodeId, node);

  for (const child of node.children) {
    this._indexSubtree(child);
  }
}
```

Suppose the tree is:

```text
root
 ├── ch_1
 ├── ch_2
 │    ├── sec_2_1
 │    └── sec_2_2
 └── ch_3
```

The map becomes approximately:

```javascript
{
  "root"     → root,
  "ch_1"     → ch_1,
  "ch_2"     → ch_2,
  "sec_2_1"  → sec_2_1,
  "sec_2_2"  → sec_2_2,
  "ch_3"     → ch_3
}
```

---

# 11. `getNode()`

The map allows direct lookup:

```javascript
getNode(nodeId) {
  return this.indexMap.get(nodeId);
}
```

So:

```javascript
treeIndex.getNode("sec_2_2");
```

returns the corresponding `TreeNode`.

---

# 12. `getLineagePath()`

One of the most useful methods is:

```javascript
getLineagePath(nodeId)
```

Implementation:

```javascript
getLineagePath(nodeId) {
  const path = [];
  let current = this.getNode(nodeId);

  while (current) {
    path.unshift(current.nodeId);
    current = current.parent;
  }

  return path;
}
```

Suppose the selected node is:

```text
sec_2_2
```

The method starts here:

```text
sec_2_2
```

Then moves to:

```text
ch_2
```

Then:

```text
root
```

The `unshift()` operation puts each parent at the beginning.

Final result:

```javascript
[
  "root",
  "ch_2",
  "sec_2_2"
]
```

---

# 13. Tree Export / Import

The index also supports serialization.

For example:

```javascript
exportToJSON()
```

can convert the tree into JSON.

This allows the tree to be:

```text
Tree
 ↓
JSON
 ↓
File / Database
```

Later it can be restored using:

```javascript
importFromJSON(json)
```

This separates tree construction from tree persistence.

---

# 14. `src/search/SummaryPruner.js`

This file handles node relevance scoring.

The search engine doesn't immediately load complete document content.

Instead, it evaluates lightweight information such as:

```text
title
summary
keywords
entities
```

---

# 15. `calculateRelevanceScore()`

A simplified implementation:

```javascript
static calculateRelevanceScore(query, node) {
  const normalizedQuery = query.toLowerCase();

  const queryTerms = normalizedQuery
    .split(/\s+/)
    .filter(term => term.length > 2);

  const nodeText = `
    ${node.title}
    ${node.summary}
    ${node.keywords.join(" ")}
    ${node.entities.join(" ")}
  `.toLowerCase();

  let score = 0;

  for (const term of queryTerms) {
    if (nodeText.includes(term)) {
      score += 2.0;
    }
  }

  for (const term of queryTerms) {
    if (node.title.toLowerCase().includes(term)) {
      score += 3.0;
    }
  }

  return score;
}
```

---

# 16. Query Normalization

First:

```javascript
query.toLowerCase()
```

converts:

```text
How Do Sticky Sessions Handle Failover?
```

into:

```text
how do sticky sessions handle failover?
```

This makes matching case-insensitive.

---

# 17. Query Tokenization

Next:

```javascript
.split(/\s+/)
```

turns the query into:

```javascript
[
  "how",
  "do",
  "sticky",
  "sessions",
  "handle",
  "failover?"
]
```

Short words are removed:

```javascript
.filter(term => term.length > 2)
```

---

# 18. Creating Searchable Node Text

The node's important metadata is combined:

```javascript
const nodeText = `
  ${node.title}
  ${node.summary}
  ${node.keywords.join(" ")}
  ${node.entities.join(" ")}
`.toLowerCase();
```

So the search algorithm checks one combined string.

---

# 19. Relevance Scoring

A matching term can increase the score:

```javascript
score += 2.0;
```

If the match appears in the title:

```javascript
score += 3.0;
```

Therefore title matches receive a stronger boost.

For example:

```text
Query:
sticky sessions failover
```

A node titled:

```text
Session Persistence & Sticky Sessions
```

will receive a higher score than an unrelated node.

---

# 20. `pruneNodes()`

The next method filters weak candidates.

Conceptually:

```javascript
static pruneNodes(query, nodes, threshold) {
  return nodes
    .map(node => ({
      node,
      score: this.calculateRelevanceScore(query, node),
    }))
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
```

The process is:

```text
All child nodes
      ↓
Calculate score
      ↓
Remove low-score nodes
      ↓
Sort remaining nodes
      ↓
Return relevant candidates
```

---

# 21. `src/search/AgenticTreeSearchEngine.js`

This file controls the actual search.

It combines:

```text
HierarchicalTreeIndex
        +
SummaryPruner
        +
TreeNode
```

---

# 22. Search Initialization

The search starts from the root:

```javascript
let currentNode = this.treeIndex.root;
```

The initial path is usually:

```javascript
const traversalPath = [currentNode.nodeId];
```

---

# 23. Inspecting Children

The engine checks:

```javascript
while (currentNode.children.length > 0) {
```

As long as the current node has children, the search continues.

---

# 24. Evaluating Child Nodes

The children are passed to the pruner:

```javascript
const candidates =
  SummaryPruner.pruneNodes(
    query,
    currentNode.children,
    this.pruningThreshold
  );
```

For example:

```text
Current node:
Chapter 2

Children:
 ├── Section 2.1
 └── Section 2.2
```

The pruner scores both.

---

# 25. Selecting the Best Branch

The search engine chooses the strongest candidate.

Conceptually:

```javascript
const selected = candidates[0];
```

Because candidates are sorted by score, index `0` contains the best match.

---

# 26. Moving Down the Tree

After selection:

```javascript
currentNode = selected.node;
```

And the path is updated:

```javascript
traversalPath.push(currentNode.nodeId);
```

Example:

```javascript
[
  "root",
  "ch_2",
  "sec_2_2"
]
```

---

# 27. Leaf Detection

The loop eventually reaches a node where:

```javascript
currentNode.children.length === 0
```

At this point the search stops.

The engine can retrieve:

```javascript
currentNode.content
```

---

# 28. Search Result

The search result can contain information such as:

```javascript
{
  node: currentNode,
  content: currentNode.content,
  traversalPath,
  lineage: this.treeIndex.getLineagePath(
    currentNode.nodeId
  )
}
```

So the caller gets both:

```text
Actual content
+
Where that content came from
```

---

# 29. Complete Tree Search Flow

The complete implementation flow is:

```text
AgenticTreeSearchEngine
        ↓
root
        ↓
children
        ↓
SummaryPruner
        ↓
relevance scores
        ↓
best child
        ↓
children of best child
        ↓
SummaryPruner
        ↓
best child
        ↓
repeat
        ↓
leaf
        ↓
content
        ↓
lineage
        ↓
result
```

---

# 30. `src/wiki/WikiVault.js`

The Wiki implementation uses a different data structure.

Instead of `TreeNode`, it works with Markdown files.

---

# 31. `WikiFileEntry`

A wiki file is represented by an object/class containing fields such as:

```javascript
class WikiFileEntry {
  constructor({
    filePath,
    title,
    category,
    tags,
    summary,
    content,
  }) {
    this.filePath = filePath;
    this.title = title;
    this.category = category;
    this.tags = tags;
    this.summary = summary;
    this.content = content;
  }
}
```

Example:

```javascript
new WikiFileEntry({
  filePath: "docs/caching/redis-cluster-strategies.md",
  title: "Redis Cluster Strategies",
  category: "Caching",
  tags: ["redis", "cluster", "caching"],
  summary: "Redis cluster architecture and scaling strategies",
  content: "# Redis Cluster..."
});
```

---

# 32. `WikiVault`

The vault stores multiple files:

```javascript
class WikiVault {
  constructor(entries = []) {
    this.entries = entries;
  }
}
```

For example:

```text
WikiVault
 ├── distributed-locking.md
 ├── redis-cluster-strategies.md
 └── kubernetes-ingress-setup.md
```

---

# 33. `listCatalogMetadata()`

This method intentionally returns only metadata.

Conceptually:

```javascript
listCatalogMetadata() {
  return this.entries.map(entry => ({
    filePath: entry.filePath,
    title: entry.title,
    category: entry.category,
    tags: entry.tags,
    summary: entry.summary,
  }));
}
```

Notice that:

```javascript
content
```

is not returned.

This keeps the catalog lightweight.

---

# 34. `readFileContent()`

When the application finally knows which file it wants:

```javascript
readFileContent(filePath) {
  const entry = this.entries.find(
    entry => entry.filePath === filePath
  );

  return entry?.content || null;
}
```

So the complete Markdown content is only retrieved when explicitly requested.

---

# 35. `src/wiki/LLMLibrarian.js`

`LLMLibrarian.js` is responsible for creating/populating the example knowledge vault.

It creates multiple `WikiFileEntry` objects.

For example:

```javascript
const locking = new WikiFileEntry({
  filePath: "docs/architecture/distributed-locking.md",
  title: "Distributed Locking",
  category: "Architecture",
  tags: ["distributed systems", "locks"],
  summary: "Distributed locking strategies",
  content: "...",
});
```

Then the entries are added to the vault:

```javascript
return new WikiVault([
  locking,
  redis,
  kubernetes,
]);
```

This gives the retriever a ready-to-use knowledge source.

---

# 36. `src/wiki/TwoPassRetriever.js`

This file contains the complete Wiki retrieval process.

The main method is generally:

```javascript
searchAndRetrieve(query)
```

---

# 37. Pass 1 — Load Metadata

The first operation is:

```javascript
const catalog =
  this.vault.listCatalogMetadata();
```

The result looks like:

```javascript
[
  {
    filePath: "...",
    title: "...",
    category: "...",
    tags: [...],
    summary: "..."
  },
  ...
]
```

Notice that the full Markdown content isn't included.

---

# 38. Scoring Catalog Entries

For every catalog entry:

```javascript
for (const meta of catalog) {
```

the implementation creates searchable text:

```javascript
const metaText = `
  ${meta.title}
  ${meta.summary}
  ${meta.tags.join(" ")}
`.toLowerCase();
```

Then it compares the query against this metadata.

---

# 39. Candidate Collection

If a file has a positive score:

```javascript
if (score > 0) {
  candidateFiles.push({
    filePath: meta.filePath,
    score,
  });
}
```

So instead of loading every file, the system creates a small candidate list.

---

# 40. Sorting Candidates

The candidates are sorted:

```javascript
candidateFiles.sort(
  (a, b) => b.score - a.score
);
```

This means:

```text
highest score
      ↓
lowest score
```

---

# 41. Selecting the File

The best candidate is:

```javascript
const selectedFile = candidateFiles[0];
```

The selected path might be:

```text
docs/caching/redis-cluster-strategies.md
```

---

# 42. Pass 2 — Read Actual Content

Only now does the implementation request the full file:

```javascript
const rawContent =
  this.vault.readFileContent(
    selectedFile.filePath
  );
```

This gives the actual Markdown document.

---

# 43. Returning the Retrieval Result

The retriever can return:

```javascript
return {
  selectedFile: selectedFile.filePath,
  retrievedFullContent: rawContent,
};
```

So callers receive:

```text
Selected file
+
Full content
```

---

# 44. `src/comparison/VectorVsVectorlessBenchmark.js`

This file demonstrates the difference between two retrieval implementations.

The benchmark doesn't implement a production vector database.

Instead, it simulates fixed-size chunking and compares the resulting retrieval behavior with the tree implementation.

---

# 45. Fixed-Size Chunk Simulation

A document is divided into pieces.

For example:

```javascript
const chunkSize = 150;

for (
  let i = 0;
  i < text.length;
  i += chunkSize
) {
  chunks.push(
    text.slice(i, i + chunkSize)
  );
}
```

This produces:

```text
Document
   ↓
150 chars
   ↓
150 chars
   ↓
150 chars
   ↓
...
```

---

# 46. Running the Vectorless Search

The benchmark can then run:

```javascript
treeSearch.search(query);
```

The tree search returns something like:

```javascript
{
  content,
  traversalPath,
  nodeId
}
```

The benchmark can compare:

```text
Fixed chunks
vs
Complete tree section
```

---

# 47. `src/cli.js`

`cli.js` provides the command-line interface.

It reads command-line arguments from:

```javascript
process.argv
```

For example:

```bash
npm run tree-search
```

or:

```bash
node src/cli.js --mode=tree
```

The CLI determines which part of the application should execute.

---

# 48. Tree Mode

When:

```text
--mode=tree
```

is supplied, the CLI:

1. Builds the tree.
2. Creates `HierarchicalTreeIndex`.
3. Creates `AgenticTreeSearchEngine`.
4. Sends a query.
5. Runs traversal.
6. Prints the selected node.
7. Prints the lineage.
8. Prints retrieved content.

---

# 49. Wiki Mode

When:

```text
--mode=wiki
```

is supplied:

```text
LLMLibrarian
      ↓
WikiVault
      ↓
TwoPassRetriever
      ↓
catalog scan
      ↓
file selection
      ↓
content loading
```

---

# 50. Benchmark Mode

When:

```text
--mode=benchmark
```

is supplied:

```text
VectorVsVectorlessBenchmark
        ↓
Fixed chunk simulation
        ↓
Tree retrieval
        ↓
Comparison
        ↓
Console output
```

---

# 51. `src/index.js`

`index.js` is the main programmatic entry point.

It can coordinate the different demonstrations.

A typical execution flow is:

```javascript
async function main() {
  // Build tree
  // Run tree search
  // Build wiki
  // Run two-pass retrieval
  // Run benchmark
}
```

Then:

```javascript
main();
```

starts the application.

---

# 52. Complete Code Execution Flow

When running:

```bash
npm start
```

the application roughly follows:

```text
src/index.js
      │
      ├── config.js
      │
      ├── TreeBuilder
      │      │
      │      └── TreeNode
      │
      ├── HierarchicalTreeIndex
      │
      ├── AgenticTreeSearchEngine
      │      │
      │      └── SummaryPruner
      │
      ├── LLMLibrarian
      │      │
      │      └── WikiVault
      │
      ├── TwoPassRetriever
      │
      └── VectorVsVectorlessBenchmark
```

---

# 53. Complete Tree Search Execution

For a query such as:

```text
How do sticky sessions handle failover?
```

the actual code flow is:

```text
Query
 ↓
AgenticTreeSearchEngine
 ↓
treeIndex.root
 ↓
root.children
 ↓
SummaryPruner.calculateRelevanceScore()
 ↓
select best child
 ↓
currentNode = selected child
 ↓
currentNode.children
 ↓
SummaryPruner.calculateRelevanceScore()
 ↓
select best child
 ↓
leaf reached
 ↓
currentNode.content
 ↓
getLineagePath()
 ↓
return result
```

The important point when reading the code is that **the search engine controls traversal, while `SummaryPruner` controls scoring**.

---

# 54. Complete Wiki Retrieval Execution

For the Wiki implementation:

```text
Query
 ↓
TwoPassRetriever.searchAndRetrieve()
 ↓
WikiVault.listCatalogMetadata()
 ↓
Score metadata
 ↓
Sort candidates
 ↓
Select best file
 ↓
WikiVault.readFileContent()
 ↓
Return selected file + content
```

The important separation is:

```text
WikiVault
   ↓
storage

TwoPassRetriever
   ↓
retrieval logic
```

---

# 55. Why the Code Is Split Into These Classes

The project follows a separation-of-responsibility approach.

| Component                        | Responsibility               |
| -------------------------------- | ---------------------------- |
| `config.js`                      | Configuration                |
| `TreeNode.js`                    | Individual tree node         |
| `TreeBuilder.js`                 | Build tree                   |
| `HierarchicalTreeIndex.js`       | Manage/index tree            |
| `SummaryPruner.js`               | Score/filter nodes           |
| `AgenticTreeSearchEngine.js`     | Execute tree traversal       |
| `WikiFileEntry`                  | Represent wiki file          |
| `WikiVault.js`                   | Store/retrieve wiki files    |
| `LLMLibrarian.js`                | Create wiki data             |
| `TwoPassRetriever.js`            | Wiki retrieval               |
| `VectorVsVectorlessBenchmark.js` | Compare retrieval approaches |
| `cli.js`                         | Command-line interface       |
| `index.js`                       | Main entry point             |

This separation makes it possible to modify one part without rewriting the entire application.

---

# 56. Important Data Flow

## Tree implementation

```text
TreeBuilder
     ↓
TreeNode objects
     ↓
HierarchicalTreeIndex
     ↓
AgenticTreeSearchEngine
     ↓
SummaryPruner
     ↓
Selected TreeNode
     ↓
Content + Lineage
```

## Wiki implementation

```text
LLMLibrarian
     ↓
WikiFileEntry
     ↓
WikiVault
     ↓
TwoPassRetriever
     ↓
Metadata candidates
     ↓
Selected file
     ↓
Full content
```

---

# 57. Where to Start Reading the Code

If you're completely new to the project, don't start with `index.js`.

Use this order:

### Step 1

Read:

```text
src/tree/TreeNode.js
```

Understand what a node contains.

### Step 2

Read:

```text
src/tree/TreeBuilder.js
```

Understand how nodes are connected.

### Step 3

Read:

```text
src/tree/HierarchicalTreeIndex.js
```

Understand how the complete tree is managed.

### Step 4

Read:

```text
src/search/SummaryPruner.js
```

Understand how nodes are scored.

### Step 5

Read:

```text
src/search/AgenticTreeSearchEngine.js
```

Understand how the search moves through the tree.

### Step 6

Read:

```text
src/wiki/WikiVault.js
```

Understand how Wiki files are represented and stored.

### Step 7

Read:

```text
src/wiki/TwoPassRetriever.js
```

Understand how metadata selection and full-content retrieval work.

### Step 8

Read:

```text
src/comparison/VectorVsVectorlessBenchmark.js
```

Understand how the two retrieval approaches are compared.

### Step 9

Finally read:

```text
src/cli.js
src/index.js
```

These files become much easier to understand after you know what each component does.

---

# 58. One-Line Responsibility of Every Important Method

```text
TreeNode.addChild()
→ Connect child to parent.

TreeNode.isLeaf()
→ Check whether node has children.

TreeNode.toMetadataJSON()
→ Convert node into lightweight metadata.

HierarchicalTreeIndex._indexSubtree()
→ Recursively index every node.

HierarchicalTreeIndex.getNode()
→ Find a node by ID.

HierarchicalTreeIndex.getLineagePath()
→ Build root-to-node path.

SummaryPruner.calculateRelevanceScore()
→ Calculate node/query relevance.

SummaryPruner.pruneNodes()
→ Remove weak candidates.

AgenticTreeSearchEngine.selectBestBranch()
→ Choose the best child.

AgenticTreeSearchEngine.search()
→ Traverse the tree until a target node.

WikiVault.listCatalogMetadata()
→ Return lightweight file metadata.

WikiVault.readFileContent()
→ Return full content of one file.

TwoPassRetriever.searchAndRetrieve()
→ Select a file from metadata, then load its content.

LLMLibrarian
→ Build the example WikiVault.

VectorVsVectorlessBenchmark
→ Compare fixed chunks with tree retrieval.

CLI
→ Choose which implementation to execute.

index.js
→ Start the application.
```

---

# 59. Final Implementation Picture

The entire repository can ultimately be understood as two independent retrieval implementations sharing the same application:

```text
                         USER QUERY
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
       TREE SEARCH                     WIKI SEARCH
              │                             │
              ▼                             ▼
       TreeBuilder                    LLMLibrarian
              │                             │
              ▼                             ▼
         TreeNode                      WikiVault
              │                             │
              ▼                             ▼
   HierarchicalTreeIndex            TwoPassRetriever
              │                             │
              ▼                             ▼
     SummaryPruner                  Metadata Scoring
              │                             │
              ▼                             ▼
   AgenticTreeSearchEngine           Best File
              │                             │
              ▼                             ▼
       Selected Node                 Full Markdown
              │                             │
              └──────────────┬──────────────┘
                             ▼
                          RESULT
```

**The key implementation idea is the separation of responsibilities:** data structures store the knowledge, index classes organize it, retrieval classes decide what to select, and the CLI/entry point coordinates execution.
