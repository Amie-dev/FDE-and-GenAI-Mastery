# Chapter 03 — Agentic Tree Search & LLM Relevance-Based Retrieval

## 3.1 What Is Agentic Tree Search?

**Agentic Tree Search** is a retrieval technique where an LLM acts as an **agent** that actively navigates a hierarchical document tree to find the most relevant content.

Instead of relying on similarity matching between vectors, the agent:

* 🧭 Evaluates node summaries and metadata
* 🎯 Selects which branches to explore
* ✂️ Prunes branches deemed irrelevant
* 📄 Lazy-loads full content only when needed
* 🧠 Synthesizes answers with full structural context

### Key Components

```mermaid
flowchart LR

    QUERY["👤 User Query"]
    TREE["🌳 Tree Index"]
    AGENT["🤖 LLM Agent"]
    STORE["🗄️ Tree Store"]
    SOURCE["📄 Original Document"]

    QUERY --> AGENT
    TREE --> AGENT
    STORE --> TREE
    TREE --> SOURCE

    style QUERY fill:#e3f2fd,stroke:#1976d2
    style TREE fill:#e8f5e9,stroke:#2e7d32
    style AGENT fill:#fff3e0,stroke:#ef6c00
    style STORE fill:#f3e5f5,stroke:#7b1fa2
    style SOURCE fill:#fff8e1,stroke:#ffa000
```

### Agentic Retrieval vs. Traditional Retrieval

| Aspect | Traditional Vector Search | Agentic Tree Search |
|--------|--------------------------|---------------------|
| Search Space | Flat vector space | Document hierarchy |
| Retrieval Method | Similarity matching | Structural navigation |
| Decision Maker | Metric (cosine, dot) | LLM reasoning |
| Context | Chunk-level | Hierarchical |
| Explainability | Low (score = 0.814) | High (path = Chapter → Section → Page) |

---

## 3.2 AlphaGo-Inspired Tree Traversal

The roadmap specifies **AlphaGo-inspired top-down agentic tree traversal** as a core technique. AlphaGo uses Monte Carlo Tree Search (MCTS) to progressively explore promising game positions rather than examining every possible position equally.

### AlphaGo Patterns Applied to Tree Navigation

| AlphaGo Concept | Vectorless RAG Application |
|-----------------|---------------------------|
| **Progressive Narrowing** | Explore promising document branches; prune irrelevant ones |
| **Value Estimation** | LLM estimates node relevance based on query intent |
| **Policy Networks** | Heuristics determine which branches are most promising |
| **Monte Carlo Sampling** | Balance exploration vs. exploitation during evaluation |

### Progressive Narrowing

```mermaid
flowchart TD

    QUERY["👤 Query: Sticky sessions during ALB failure?"]

    QUERY --> ROOT["📘 Document Root"]

    ROOT --> CH1["Chapter 1"]
    ROOT --> CH2["Chapter 2: Load Balancing"]
    ROOT --> CH3["Chapter 3"]

    CH1 --> PRUNE1["❌ Pruned"]
    CH2 --> KEEP["✅ Kept"]
    CH3 --> PRUNE2["❌ Pruned"]

    KEEP --> SEC21["Section 2.1"]
    KEEP --> SEC22["Section 2.2: Session Persistence"]
    KEEP --> SEC23["Section 2.3"]

    SEC21 --> PRUNE3["❌ Pruned"]
    SEC22 --> KEEP2["✅ Kept"]
    SEC23 --> PRUNE4["❌ Pruned"]

    KEEP2 --> SUB221["2.2.1 Cookie-Based"]
    KEEP2 --> SUB222["2.2.2 Session Failover"]

    SUB221 --> PRUNE5["⚠️ Reviewed"]
    SUB222 --> TARGET["🎯 Target"]

    style QUERY fill:#fff3e0,stroke:#ef6c00
    style ROOT fill:#e8f5e9,stroke:#2e7d32
    style CH1 fill:#ffcdd2,stroke:#c62828
    style CH2 fill:#c8e6c9,stroke:#2e7d32
    style CH3 fill:#ffcdd2,stroke:#c62828
    style SEC22 fill:#c8e6c9,stroke:#2e7d32
    style SUB222 fill:#c8e6c9,stroke:#2e7d32
```

### AlphaGo-Inspired Pseudo-Code (TypeScript)

```typescript
type TreeNode = {
  nodeId: string;
  title: string;
  level: number;
  pageRange: [number, number];
  parentId: string | null;
  childrenIds: string[];
  summary: string;
  keywords: string[];
  entities: string[];
};

type RetrievedNode = {
  node: TreeNode;
  content: string;
  path: TreeNode[];
  relevanceScore: number;
};

// AlphaGo-style MCTS-inspired tree traversal with progressive refinement
async function alphaGoTreeSearch(
  tree: Map<string, TreeNode>,
  query: string,
  rootId: string,
  llm: { generate(prompt: string): Promise<string> },
  maxIterations = 20,
  topK = 3
): Promise<RetrievedNode> {
  const root = tree.get(rootId)!;
  const visited = new Set<string>();
  const path: TreeNode[] = [];

  let current = root;
  path.push(current);

  // Progressive narrowing — top-down
  for (let i = 0; i < maxIterations; i++) {
    if (visited.has(current.nodeId)) break;
    visited.add(current.nodeId);

    // 1. Policy Evaluation (AlphaGo policy network equivalent)
    const score = await evaluateNodeRelevance(current, query, llm);

    // 2. Selection — get children
    const children = current.childrenIds
      .map((id) => tree.get(id))
      .filter((n): n is TreeNode => n !== undefined);

    // 3. Check if leaf node
    if (children.length === 0) {
      const content = await lazyLoadContent(current);
      return { node: current, content, path, relevanceScore: score };
    }

    // 4. MCTS Selection — sort by score, explore top-K branches
    const scoredChildren = await Promise.all(
      children.map(async (child) => ({
        node: child,
        score: await evaluateNodeRelevance(child, query, llm),
      }))
    );

    const promising = scoredChildren
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // 5. UCB-like exploration bonus for under-visited branches
    const finalScores = promising.map((p) => {
      const explorationBonus = visited.has(p.node.nodeId) ? -Infinity : 5;
      return { ...p, adjustedScore: p.score + explorationBonus };
    });

    // 6. Exploit the best branch (descend)
    const best = finalScores.reduce((max, cur) =>
      cur.adjustedScore > max.adjustedScore ? cur : max
    );

    current = best.node;
    path.push(current);
  }

  const content = await lazyLoadContent(current);
  const score = await evaluateNodeRelevance(current, query, llm);
  return { node: current, content, path, relevanceScore: score };
}
```

### Key Benefits

1. **Progressive Narrowing** — Like AlphaGo exploring promising board regions, the agent narrows to the most promising document sections.
2. **Self-Improving** — Learns which document regions are most relevant for similar queries over time.
3. **Efficient Pruning** — Skips irrelevant sections before loading their full content.
4. **Explicit Path** — Every retrieval decision is traceable.

---

## 3.3 Vector Search vs Agentic Tree Search

```mermaid
flowchart LR

    subgraph VECTOR["🔵 Vector RAG"]

        Q1["👤 User Query"]
        Q1 --> E["Query Embedding"]
        E --> DB[("Vector DB")]

        DB --> C1["Chunk 1"]
        DB --> C2["Chunk 2"]
        DB --> C3["Chunk 3"]
        DB --> C4["Chunk ..."]

        C1 --> R["Top-K Results"]
        C2 --> R
        C3 --> R
        C4 --> R
    end

    subgraph TREE["🟢 Vectorless RAG"]

        Q2["👤 User Query"]
        Q2 --> ROOT["🌳 Root"]

        ROOT --> B["Select Relevant Branch"]
        B --> S["Select Relevant Section"]
        S --> T["Select Relevant Topic"]
        T --> P["📄 Target Page"]

        P --> R2["Full Context"]
    end
```

### Mental Model

**Vector RAG:**
> "Search everywhere and rank by similarity."

**Vectorless RAG:**
> "Navigate intelligently and progressively narrow the search."

---

## 3.4 Example Query: Step-by-Step Navigation

Consider this question:

> **"How do sticky sessions behave during ALB failure?"**

Suppose our document contains:

```text
Distributed Systems Architecture Manual

├── Chapter 1: Networking

├── Chapter 2: Load Balancing
│   ├── Section 2.1: CDN Architecture
│   ├── Section 2.2: Session Persistence
│   │   ├── 2.2.1 Cookie-Based Sticky Sessions
│   │   └── 2.2.2 Session Failover & Recovery
│   └── Section 2.3: Traffic Routing
│
└── Chapter 3: Database Replication
```

The correct answer is inside:

```text
Chapter 2
   ↓
Section 2.2
   ↓
Subsection 2.2.2
```

### Step 1 — Evaluate the Root

The LLM first sees the top-level structure:

```mermaid
flowchart TD

    Q["👤 Query:<br/>How do sticky sessions behave<br/>during ALB failure?"]

    Q --> ROOT["📘 Document Root"]

    ROOT --> EVAL{"🤖 LLM evaluates<br/>top-level summaries"}

    EVAL --> C1["Chapter 1<br/>Networking"]
    EVAL --> C2["Chapter 2<br/>Load Balancing"]
    EVAL --> C3["Chapter 3<br/>Database Replication"]

    C1 --> X1["❌ Not relevant"]
    C2 --> OK["✅ Relevant"]
    C3 --> X3["❌ Not relevant"]
```

The agent reasons:

```text
Sticky sessions + ALB failure
        ↓
Load Balancing
        ↓
Chapter 2 is relevant
```

It **prunes** Chapters 1 and 3.

### Step 2 — Expand the Relevant Branch

The agent looks inside Chapter 2:

```mermaid
flowchart TD

    CH["📑 Chapter 2<br/>Load Balancing"]

    CH --> S1["Section 2.1<br/>CDN Architecture"]
    CH --> S2["Section 2.2<br/>Session Persistence"]
    CH --> S3["Section 2.3<br/>Traffic Routing"]

    S1 --> X1["❌ Discard"]
    S2 --> OK["✅ Select"]
    S3 --> X3["❌ Discard"]
```

LLM sees summaries like:

```text
2.1 CDN Architecture
→ Static asset distribution and edge caching.

2.2 Session Persistence
→ Cookie-based sticky sessions and failover
   behavior during server failures.

2.3 Traffic Routing
→ General request routing and traffic policies.
```

Section 2.2 matches the query.

### Step 3 — Continue Down the Tree

The agent expands Section 2.2:

```mermaid
flowchart TD

    SEC["📌 Section 2.2<br/>Session Persistence"]

    SEC --> A["2.2.1<br/>Cookie-Based Sticky Sessions"]
    SEC --> B["2.2.2<br/>Session Failover & Recovery"]

    A --> X["⚠️ Related"]
    B --> TARGET["🎯 Highly Relevant"]
```

The agent identifies:

```text
2.2.2 Session Failover & Recovery
        ↓
Pages 181–200
```

We have reached the target area.

### Step 4 — Lazy Load the Actual Content

#### Why Lazy Loading Matters

The system did **not** load the entire 500-page document. Instead, it used lightweight metadata:

```text
Chapter summaries
Section summaries
Page ranges
Keywords
Node relationships
```

Only after finding the relevant branch does it load the actual pages.

```mermaid
flowchart TD

    TREE["🌳 Tree Index"]

    TREE --> ROOT["Root"]
    ROOT --> CH["Chapter 2"]
    CH --> SEC["Section 2.2"]
    SEC --> SUB["Subsection 2.2.2"]

    SUB --> RANGE["Pages 181–200"]

    RANGE --> LOAD["📥 Lazy Load"]
    LOAD --> RAW["📄 Original Page Content"]

    RAW --> CONTEXT["📝 Full Context"]
    CONTEXT --> LLM["🤖 Answer Generation"]
```

#### Comparison

| Traditional Approach | Tree Approach |
|----------------------|---------------|
| Search → 10 fragmented chunks → LLM | Navigate → Relevant section → 1–2 targeted pages → Full surrounding context → LLM |

---

## 3.5 Complete Agentic Tree Search Flow

```mermaid
flowchart TD

    Q["👤 User Query"]

    Q --> ROOT["🌳 Root Node"]

    ROOT --> E1{"🤖 Evaluate Chapters"}

    E1 --> X1["❌ Chapter 1"]
    E1 --> CH2["✅ Chapter 2: Load Balancing"]
    E1 --> X3["❌ Chapter 3"]

    CH2 --> E2{"🤖 Evaluate Sections"}

    E2 --> X21["❌ Section 2.1"]
    E2 --> SEC22["✅ Section 2.2"]
    E2 --> X23["❌ Section 2.3"]

    SEC22 --> E3{"🤖 Evaluate Subsections"}

    E3 --> X221["⚠️ 2.2.1"]
    E3 --> SUB222["🎯 2.2.2 Session Failover"]

    SUB222 --> PAGE["📄 Pages 181–200"]

    PAGE --> LOAD["Lazy Load Full Content"]

    LOAD --> ANSWER["🧠 Synthesize Answer"]
```

This is **agentic retrieval** because the LLM actively decides which branches to explore.

---

## 3.6 Why This Is More Traceable

A Vector RAG retrieval might look like:

```text
Chunk #472
Similarity: 0.814
```

Vectorless RAG provides an explicit path:

```text
Document
  ↓
Chapter 2: Load Balancing
  ↓
Section 2.2: Session Persistence
  ↓
Subsection 2.2.2: Session Failover
  ↓
Pages 181–184
```

### Traceable Answer Template

```text
Answer:
When an ALB node fails, session traffic is redirected
according to the documented failover mechanism.

Source:
Distributed Systems Architecture Manual v2

Navigation Path:
Root
 → Chapter 2: Load Balancing
 → Section 2.2: Session Persistence
 → Subsection 2.2.2: Session Failover & Recovery

Pages:
181–184

Node:
sub_2_2_2
```

The important part isn't just the citation — it's that the system can explain **how it reached that source**.

---

## 3.7 Why Hierarchical Context Helps

Consider a query:

> "How does it handle state persistence?"

The word **"it"** is ambiguous. But if the previous conversation was:

> "How does the ALB maintain user sessions?"

Then the LLM can resolve:

```text
"it"
  ↓
ALB
  ↓
Load Balancing
  ↓
Session Persistence
```

### Reference Resolution via Tree

```mermaid
flowchart TD

    HISTORY["💬 Conversation History"]

    HISTORY --> REF["'it'"]

    REF --> RESOLVE["🤖 LLM Resolves Reference"]

    RESOLVE --> ALB["Application Load Balancer"]

    ALB --> TREE["🌳 Load Balancing Branch"]

    TREE --> SESSION["Session Persistence"]

    SESSION --> ANSWER["Relevant Content"]
```

The tree gives the agent a natural place to continue searching.

---

## 3.8 Complex Queries: Global Context

### Query

> **"Summarize all high-availability strategies across the entire system."**

A vector search might return:

```text
Chunk 12 → High availability
Chunk 89 → High availability
Chunk 203 → HA architecture
Chunk 401 → Availability
Chunk 512 → Failover
```

These are isolated pieces. The system may miss the **global architecture**.

### Tree-Based Global Search

```mermaid
flowchart TD

    Q["👤 Summarize all High-Availability Strategies"]

    Q --> ROOT["📘 Document Root"]

    ROOT --> C1["Chapter 1<br/>Networking"]
    ROOT --> C2["Chapter 2<br/>Load Balancing"]
    ROOT --> C3["Chapter 3<br/>Database Replication"]

    C1 --> A1["HA Strategy A"]
    C2 --> A2["HA Strategy B"]
    C3 --> A3["HA Strategy C"]

    A1 --> AGG["🧠 Aggregate Findings"]
    A2 --> AGG
    A3 --> AGG

    AGG --> FINAL["📋 Global Architecture Summary"]
```

The agent inspects multiple branches and combines findings.

---

## 3.9 Agentic Retrieval Is a Reasoning Process

> Retrieval becomes a **reasoning process**:

```mermaid
flowchart TD

    Q["Query"]
    Q --> Q1["Understand intent"]
    Q1 --> Q2["Inspect root"]
    Q2 --> Q3["Select branch"]
    Q3 --> Q4["Inspect children"]
    Q4 --> Q5["Select section"]
    Q5 --> Q6["Inspect deeper nodes"]
    Q6 --> Q7["Find target"]
    Q7 --> Q8["Load content"]
    Q8 --> Q9["Reason over content"]
    Q9 --> Q10["Generate answer"]

    style Q fill:#e3f2fd,stroke:#1976d2
    style Q10 fill:#fff3e0,stroke:#ef6c00
```

> **Retrieval itself becomes an intelligent navigation task.**

---

## 3.10 Optimization #1 — Summary-First Pruning

Don't send entire content of every node. Instead, send a summary:

```text
Expensive:
5,000-token section
   ↓
LLM evaluation

Efficient:
50–100 token summary
   ↓
LLM evaluation
```

```mermaid
flowchart TD

    ROOT["🌳 Tree"]

    ROOT --> S1["Section Summary<br/>~50 tokens"]
    ROOT --> S2["Section Summary<br/>~50 tokens"]
    ROOT --> S3["Section Summary<br/>~50 tokens"]
    ROOT --> S4["Section Summary<br/>~50 tokens"]

    S1 --> X1["❌ Prune"]
    S2 --> X2["❌ Prune"]
    S3 --> KEEP["✅ Keep"]
    S4 --> X4["❌ Prune"]

    KEEP --> RAW["Load Full Content"]
```

The LLM first asks:

> **"Is this branch worth exploring?"**

Only promising branches are expanded.

### Summary-First Pruning Pseudo-Code

```typescript
async function shouldPruneNode(
  node: TreeNode,
  query: string,
  llm: { generate(prompt: string): Promise<string> }
): Promise<boolean> {
  const prompt = `
    Node Title: ${node.title}
    Summary: ${node.summary}
    Keywords: ${node.keywords.join(", ")}
    Page Range: ${node.pageRange.join("–")}

    User Query: "${query}"

    Does this section appear relevant?
    Answer ONLY "yes" or "no".
  `;

  const response = await llm.generate(prompt);
  return response.trim().toLowerCase() !== "yes";
}
```

---

## 3.11 Optimization #2 — Parallel Subtree Evaluation

Sibling nodes can be evaluated concurrently:

```text
Sequential:
Section 1 → wait
Section 2 → wait
Section 3 → wait

Parallel:
Section 1 ──┐
Section 2 ──┼──→ LLM Evaluation
Section 3 ──┘
```

```mermaid
flowchart TD

    ROOT["🌳 Parent Node"]

    ROOT --> P["⚡ Parallel Evaluation"]

    P --> S1["Section 1"]
    P --> S2["Section 2"]
    P --> S3["Section 3"]
    P --> S4["Section 4"]

    S1 --> R["Combine Results"]
    S2 --> R
    S3 --> R
    S4 --> R

    R --> SELECT["🎯 Select Best Branch"]
```

In TypeScript, this uses `Promise.all(...)`:

```typescript
async function parallelBranchEvaluation(
  children: TreeNode[],
  query: string,
  llm: { generate(prompt: string): Promise<string> }
): Promise<{ node: TreeNode; score: number }[]> {
  const evaluations = await Promise.all(
    children.map(async (child) => ({
      node: child,
      score: await evaluateNodeRelevance(child, query, llm),
    }))
  );

  return evaluations.sort((a, b) => b.score - a.score);
}
```

The goal is to reduce **wall-clock latency**.

---

## 3.12 Optimization #3 — Tree Structure Caching

The document tree is usually generated once during indexing and reused.

```mermaid
flowchart LR

    DOC["📄 Document"]

    DOC --> INDEX["Indexing"]
    INDEX --> TREE["🌳 Generate Tree"]

    TREE --> CACHE[("⚡ Cache / Fast Store")]

    CACHE --> Q1["Query 1"]
    CACHE --> Q2["Query 2"]
    CACHE --> Q3["Query 3"]
    CACHE --> Q4["Query 4"]
```

### Storage Options

| Storage | Use Case | Notes |
|---------|----------|-------|
| **In-memory** | Small KBs | Fastest, no persistence |
| **Redis** | Medium KBs | Fast, shared across instances |
| **SQLite** | Local apps | ACID, single file |
| **PostgreSQL** | Enterprise | JSON + full-text search |
| **JSON files** | Portable | Simple, human-readable |

> **Build the tree once, reuse it for many queries.**

---

## 3.13 Combined Optimization Strategy

```mermaid
flowchart TD

    Q["👤 User Query"]

    Q --> ROOT["🌳 Tree"]

    ROOT --> SUMMARY["1️⃣ Summary-First Pruning"]

    SUMMARY --> PARALLEL["2️⃣ Parallel Branch Evaluation"]

    PARALLEL --> SELECT["🎯 Select Relevant Branch"]

    SELECT --> CACHE["3️⃣ Cached Tree Structure"]

    CACHE --> NODE["Relevant Node"]

    NODE --> LOAD["Lazy Load Raw Content"]

    LOAD --> LLM["🤖 Final Reasoning"]
```

---

## 3.14 Zero-Vector Relevance Reasoning

**Zero-vector relevance reasoning** determines relevance **without** embedding vectors or similarity scores.

### Zero-Vector vs. Vector-Based Relevance

| Approach | Decision Basis | Example Output |
|----------|----------------|----------------|
| **Vector-Based** | Math: cosine / dot product | "Chunk #472, similarity: 0.814" |
| **Zero-Vector** | Structural summary + LLM | "Section 2.2: Session Persistence" |

### Zero-Vector Pseudo-Code (TypeScript)

```typescript
/**
 * Zero-vector relevance scoring — no embeddings, no similarity math.
 * The LLM judges relevance purely from structural metadata.
 */
async function zeroVectorRelevanceScoring(
  node: TreeNode,
  query: string,
  llm: { generate(prompt: string): Promise<string> }
): Promise<number> {
  const prompt = `
    Node Title: ${node.title}
    Node Summary: ${node.summary}
    Keywords: ${node.keywords.join(", ")}
    Entities: ${node.entities.join(", ")}
    Page Range: ${node.pageRange.join("–")}

    User Query: "${query}"

    On a scale of 0–100, how likely is this node to contain
    the information needed to answer the query?
    Output ONLY a number.
  `;

  const score = parseInt(await llm.generate(prompt));
  return isNaN(score) ? 0 : score;
}

/**
 * Zero-vector agentic search over a document tree.
 */
async function vectorlessAgenticSearch(
  tree: Map<string, TreeNode>,
  query: string,
  rootId: string,
  llm: { generate(prompt: string): Promise<string> }
): Promise<RetrievedNode> {
  const path: TreeNode[] = [];
  let current = tree.get(rootId)!;

  while (true) {
    path.push(current);

    const score = await zeroVectorRelevanceScoring(current, query, llm);

    const children = current.childrenIds
      .map((id) => tree.get(id))
      .filter((n): n is TreeNode => n !== undefined);

    if (children.length === 0 || score < 30) {
      break;
    }

    const childScores = await Promise.all(
      children.map(async (child) => ({
        node: child,
        score: await zeroVectorRelevanceScoring(child, query, llm),
      }))
    );

    const best = childScores.reduce((max, cur) =>
      cur.score > max.score ? cur : max
    );

    current = best.node;
  }

  const content = await lazyLoadContent(current);
  const score = await zeroVectorRelevanceScoring(current, query, llm);

  return {
    node: current,
    content,
    path,
    relevanceScore: score,
  };
}

// Lazy load the full content of a node only after it is selected
async function lazyLoadContent(node: TreeNode): Promise<string> {
  return `[Lazy loaded content for node: ${node.title}\nPage range: ${node.pageRange.join("–")}]`;
}
```

### Why Zero-Vector Matters

| Benefit | Explanation |
|---------|-------------|
| **Explicit Traceability** | Decisions based on readable node summaries, not opaque vector scores |
| **Structural Context** | Relevance tied to document hierarchy, not content similarity alone |
| **Auditability** | Easy to explain why a section was selected (title matches topic, summary aligns) |
| **Simplicity** | No embedding infrastructure needed at inference time |
| **Reduced Bias** | Based on structural logic rather than potentially biased embeddings |

---

## 3.15 Vector RAG vs Agentic Tree Search — Detailed Comparison

| Aspect | 🔵 Vector RAG | 🟢 Agentic Tree Search |
|--------|---------------|------------------------|
| Retrieval Method | Similarity search | Hierarchical navigation |
| Search Space | Flat chunks | Document tree |
| Decision Maker | Similarity metric | LLM |
| Context | Chunk-based | Structure-aware |
| Search Path | Often opaque | Explicit |
| Citations | Retrieved chunks | Section/page lineage |
| Complex Queries | Can struggle | Better suited |
| Global Queries | Difficult | Can traverse multiple branches |
| Cost | Usually lower | More LLM calls |
| Latency | Usually lower | Requires optimization |
| Explainability | Moderate | High |

---

## 3.16 Trade-Off Considerations

```mermaid
flowchart LR

    SPEED["⚡ Fast / Low-Cost Retrieval"]
    QUALITY["🎯 Structured / Explainable Retrieval"]
    TRADE["⚖️ Trade-off"]

    SPEED --- TRADE --- QUALITY

    style SPEED fill:#e3f2fd,stroke:#1976d2
    style QUALITY fill:#e8f5e9,stroke:#2e7d32
    style TRADE fill:#fff3e0,stroke:#ef6c00
```

### Vector RAG Is Preferable When

* Documents are relatively simple / unstructured
* Semantic search is sufficient
* Very low latency is critical
* Knowledge base is flat or short

### Vectorless RAG Is Preferable When

* Documents are highly structured (manuals, textbooks, wikis)
* Exact sections and page-level traceability matter
* Context preservation is important
* Documents are long and complex
* Explainability is a priority
* Multi-hop or global queries are common

---

## 3.17 Complete Mental Model

### 🔵 Vector RAG

```text
Question
   ↓
Search every page for similar language
   ↓
Pick the closest passages
   ↓
Answer
```

### 🟢 Vectorless RAG

```text
Question
   ↓
Open Table of Contents
   ↓
Choose Chapter
   ↓
Choose Section
   ↓
Choose Subsection
   ↓
Open Relevant Pages
   ↓
Read Full Context
   ↓
Answer
```

### The Agentic Reasoning Loop

```mermaid
flowchart TD

    START["👤 Query"]

    START --> INTENT["1️⃣ Understand Intent"]

    INTENT --> EVAL_ROOT["2️⃣ Evaluate Root"]

    EVAL_ROOT --> PRUNE["3️⃣ Prune / Branch"]

    PRUNE --> EVAL_CHILD["4️⃣ Evaluate Children"]

    EVAL_CHILD --> DECIDE{"More depth?"}

    DECIDE -->|"No"| LEAF["🎯 Reached Target"]
    DECIDE -->|"Yes"| PRUNE

    LEAF --> LOAD["5️⃣ Lazy Load Content"]

    LOAD --> REASON["6️⃣ Reason Over Context"]

    REASON --> ANSWER["💬 Answer"]

    style START fill:#e3f2fd,stroke:#1976d2
    style ANSWER fill:#fff3e0,stroke:#ef6c00
    style LEAF fill:#c8e6c9,stroke:#2e7d32
```

---

## 🎯 Key Takeaways

1. **Agentic Tree Search turns retrieval into a navigation problem** — the LLM actively decides which branches to explore.
2. **The LLM evaluates node summaries** and chooses which branches are most relevant to descend into.
3. **Irrelevant branches are pruned** before any raw content is loaded.
4. **Lazy loading** retrieves full text only after reaching a relevant node or page range.
5. **Tree traversal provides an explicit, traceable retrieval path** (Chapter → Section → Page).
6. **Hierarchical retrieval excels for long, structured documents** and complex or global queries.
7. **Summary-first pruning, parallel evaluation, and caching** help control tokens and latency.
8. **Vectorless RAG trades some simplicity and latency for better structural reasoning, context preservation, and explainability**.
9. **AlphaGo-inspired MCTS and zero-vector relevance scoring** make the system audit-friendly and structure-driven.

> **Mental Model:**
> **Vector RAG asks, "Which text is similar?"**
> **Agentic Tree Search asks, "Which branch of the knowledge structure should I explore next?"**
> **Zero-Vector Reasoning asks, "Based on document structure and summaries, which section contains the answer?"**

---
