# Chapter 03: Retrieval Controls — Top-K, Threshold, Filters

> **Chapter Goal:** Turn retrieval from "give me some results" into a **bounded, calibrated decision**. Two numbers control everything downstream: how many candidates you accept (`K`) and how weak a candidate may be before it is rejected (the threshold). Both are budget decisions as much as they are quality decisions. Metadata filtering decides *which documents may be searched at all*.
>
> At the end of this chapter you should be able to answer: *for this question, how many chunks should reach the prompt, and what score is "good enough" — with evidence, not folklore?*

---

## 3.1 The Anatomy of a Retrieval Request

Every vector search in this lecture is the same five-field request, however it is spelled in a given framework:

```mermaid
flowchart LR
    Q["query<br/>text → vector"] --> R{"retrieval request"}
    K["topK<br/>how many"] --> R
    T["similarityThreshold<br/>how relevant"] --> R
    F["filterExpression<br/>which subset"] --> R
    N["namespace / tenant<br/>which index"] --> R
    R --> OUT["ranked candidates<br/>(≤ K, all ≥ threshold,<br/>all matching filter)"]

    style T fill:#89b4fa,color:#1e1e2e
    style F fill:#fab387,color:#1e1e2e
    style OUT fill:#a6e3a1,color:#1e1e2e
```

| Field | Answers the question | Failure if omitted |
|---|---|---|
| `query` | *What are we looking for?* | — (obviously required) |
| `topK` | *How many matches may be returned?* | Default of 4–10 may cut the exception clause |
| `similarityThreshold` | *How relevant must a match be to qualify?* | Out-of-domain questions still return policies |
| `filterExpression` | *Which subset of documents may be searched?* | Wrong category/tenant/version can win |
| namespace | *Which corpus, which tenant?* | Cross-tenant data leakage |

The baseline in the reference application sets only `query` and `topK(4)`. That is why its behaviour is so variable: two of the five decisions are being made implicitly (no threshold = accept anything; no filter = search everything).

---

## 3.2 Top-K: How Many Results Should We Request?

`topK(4)` asks the vector store for **at most the four highest-ranked matches**. The lecture's illustrative ranking for a return-policy question:

| Rank | Retrieved document | Illustrative similarity |
|---|---|---|
| 1 | Electronics Return Policy | 0.94 |
| 2 | General Return Policy | 0.89 |
| 3 | Damaged Product Policy | 0.85 |
| 4 | Exchange Policy | 0.79 |
| 5 | Warranty Policy | 0.68 |
| 6 | Shipping Policy | 0.42 |
| 7 | Payment Policy | 0.31 |

Read the table twice. The **correct evidence for "damaged headphones after 10 days" is ranks 1 and 3** — and `topK(3)` happens to include both, while `topK(2)` does not. Now change the embedding model, and the damaged policy might land at rank 4. The answer changes because a number nobody tuned changed.

```mermaid
flowchart TD
    Q["Question"] --> S["Ranked candidates<br/>0.94 · 0.89 · 0.85 · 0.79 · 0.68 …"]
    S --> K3["topK = 3<br/>ranks 1–3"]
    S --> K5["topK = 5<br/>ranks 1–5"]
    S --> K8["topK = 8<br/>ranks 1–8"]

    K3 --> R3["High precision<br/>may miss the exception"]
    K5 --> R5["Balanced<br/>recall + noise"]
    K8 --> R8["Higher recall<br/>more tokens, more distractors"]

    style R3 fill:#f9e2af,color:#1e1e2e
    style R5 fill:#a6e3a1,color:#1e1e2e
    style R8 fill:#f38ba8,color:#1e1e2e
```

### K is not free

| Cost dimension | Scales as | Consequence at K = 20 |
|---|---|---|
| Prompt tokens | `K × chunkTokens` | 20 × 400 = 8,000 tokens **before** the question |
| LLM cost | linear in prompt tokens | 5–10× the cost of K = 4 |
| LLM latency | roughly linear until compute-bound | + hundreds of ms |
| Distractor risk | rises with K | More chances to pick the wrong rule |
| Reranker cost | linear in K | 20 documents × query tokens, every request |

> **Token arithmetic you should do once per project:**
> `contextTokens ≈ K × chunkTokens`, and `costPerQuery ≈ contextTokens × pricePer1K`.
> A move from K=4 to K=12 at 400-token chunks is **3,200 extra tokens per query** — on 1M queries/month that is 3.2B extra tokens. Decide that consciously.

### The two-K architecture

The number of candidates you **retrieve** and the number you **send to the model** are different decisions:

```mermaid
flowchart LR
    A["Retrieve K_ret = 10–20<br/>high recall"] --> B["Filter / fuse / rerank"]
    B --> C["Send K_ctx = 3–5<br/>high precision"]
    C --> D["LLM"]

    style A fill:#89b4fa,color:#1e1e2e
    style C fill:#a6e3a1,color:#1e1e2e
```

| Stage | Typical value | Rationale |
|---|---|---|
| `K_ret` (candidates) | 10–20 | Recall is cheap to buy here; miss it and nothing downstream can recover |
| `K_ctx` (context) | 3–5 | Precision and token budget dominate answer quality |
| `K_ret` with reranking | 20–50 | Cross-encoders can recover a gem at rank 40 |

This is the single most important K insight: **retrieve generously, present sparingly.** Chapter 05 explains why the middle stage can rank far better than embeddings can.

### Choosing K empirically

| K | Best for | Watch out for |
|---|---|---|
| 3 | Narrow FAQ, high-precision domains | Missing the second half of a two-part rule |
| 4–5 | Default for support policies | Still cuts at a boundary if the gold chunk ranks 6 |
| 8–10 | Multi-condition questions, comparison questions | Noise and token cost |
| 10–20 | Candidate set *before* reranking | Never send this many to the model |

The lecture's advice is concrete: for this small chatbot, **compare K = 3, 5 and 8 and inspect the actual retrieved chunks** — and add 10 and 20 for the reranking stage.

> **K is not a quality dial; it is a recall/precision/cost trade.** Turning it up buys recall with money and distractors. There is no universal "best K".

---

## 3.3 Similarity Threshold: Are the Closest Results Relevant Enough?

A customer asks: **"Who won the IPL in 2026?"** The company knowledge base contains no cricket content whatsoever. Yet nearest-neighbour search *always returns neighbours* — it cannot return "nothing", because every query vector has a nearest vector. The board shows the scores for exactly this case:

| Candidate | Similarity |
|---|---|
| Some policy chunk | 0.31 |
| Another policy chunk | 0.19 |
| Another policy chunk | 0.06 |

With no threshold, the pipeline happily pastes three irrelevant policies into the prompt and the model does what LLMs do: it answers from whatever is there. **Closest does not mean relevant.**

A similarity threshold adds a minimum acceptance rule:

```ts
// pseudo-code — request up to 4, reject anything below 0.75
const hits = await vectorStore.similaritySearch({
  query: question,
  topK: 4,
  similarityThreshold: 0.75,
});
```

```mermaid
flowchart TD
    Q["Query embedding"] --> S["Candidate scores<br/>0.94 · 0.89 · 0.85 · 0.68 · 0.31 · 0.19 · 0.06"]
    S --> TH{"≥ threshold 0.75?"}
    TH -->|"Yes"| IN["Accepted<br/>0.94, 0.89, 0.85"]
    TH -->|"No"| OUT["Rejected<br/>0.68, 0.31, 0.19, 0.06"]
    IN --> CTX["Context"]
    OUT --> EMPTY{"Any left?"}
    EMPTY -->|"No"| REF["Explicit refusal path"]

    style IN fill:#a6e3a1,color:#1e1e2e
    style OUT fill:#f38ba8,color:#1e1e2e
    style REF fill:#f9e2af,color:#1e1e2e
```

### What the threshold actually buys

| Without threshold | With threshold |
|---|---|
| Out-of-domain questions get confident policy answers | Out-of-domain questions get an honest "I don't know" |
| Every prompt carries low-value chunks | Prompt tokens are spent only on plausible evidence |
| Refusal is impossible (something is always returned) | Refusal becomes a *reachable state* in the code |
| Evaluation cannot separate "no evidence" from "bad answer" | The two cases are distinguishable in logs |

**The threshold is what makes refusal possible.** Without it, your "grounded" assistant has no mechanism to ever say "that is not in our documents" — because retrieval never comes back empty.

### Do not treat similarity as a probability

> A similarity of **0.90 does not mean** there is a **90% chance** that the answer is correct.

Similarity measures *positional proximity in one embedding space*, not truth, not relevance, and not answerability:

| Misconception | Reality |
|---|---|
| "0.9 = 90% correct" | Similarity is uncalibrated; the mapping to correctness is corpus-specific |
| "0.75 works everywhere" | Depends on model, metric, chunk size and corpus |
| "Higher score = better chunk" | A verbose chunk about the same topic can outscore the precise clause |
| "Threshold is a safety net" | It is a *filter*; wrong-side errors still pass |

> **The lecture's warning, restated:** score behaviour varies with the embedding model, the vector store, the distance metric and the collection. A threshold such as 0.75 must be **evaluated against real test queries**, not assumed to be universally suitable.

### Empty results must be handled explicitly

If nothing survives the threshold, the application must decide — deliberately — what happens:

```ts
// pseudo-code — an explicit empty-set policy
if (hits.length === 0) {
  return {
    answer: "I couldn't find relevant information in our company documents.",
    refusal: true,
    reason: "no_candidates_above_threshold",
  };
}
```

A result that *passes* the threshold still may not contain the complete answer, so generation instructions must continue to discourage unsupported claims (Chapter 07). The threshold reduces the rate of nonsense; it does not license the model to relax.

---

## 3.4 Score Semantics, Metrics and Calibration

Every threshold is meaningless without knowing **which number you are thresholding**. This is where most cross-system confusion begins.

### The metric decides the direction

| Metric | Range (typical) | "Better" means | Threshold shape |
|---|---|---|---|
| **Cosine similarity** | −1 … 1 (text: often 0.2 … 0.95) | Larger | `score ≥ t` |
| **Dot product** | unbounded | Larger | `score ≥ t` (magnitude-sensitive) |
| **Euclidean (L2) distance** | 0 … ∞ | **Smaller** | `distance ≤ t` |
| **Inner product on normalized vectors** | = cosine | Larger | `score ≥ t` |
| **Negative distance / "similarity score"** | store-specific | Larger | `score ≥ t` |

Two consequences:

1. The same corpus with the same embedder can produce **different score ranges** on two vector databases because one normalizes and the other does not.
2. A threshold copied from a blog post — or from another collection — is a **guess**, not a configuration.

### The same query, five different score regimes

```mermaid
flowchart TD
    Q["'Can I return damaged headphones?'"] --> M1["Model A · cosine<br/>0.82"]
    Q --> M2["Model B · cosine<br/>0.61"]
    Q --> M3["Model A · L2 distance<br/>0.47"]
    Q --> M4["Model A · dot (unnormalized)<br/>12.8"]

    M1 --> T["threshold 0.75 → accept"]
    M2 --> T2["threshold 0.75 → reject<br/>(same content!)"]
    M3 --> T3["threshold 0.75 → reject<br/>(direction inverted)"]
    M4 --> T4["threshold 0.75 → accept<br/>(meaningless comparison)"]

    style T fill:#a6e3a1,color:#1e1e2e
    style T2 fill:#f38ba8,color:#1e1e2e
    style T3 fill:#f38ba8,color:#1e1e2e
    style T4 fill:#f9e2af,color:#1e1e2e
```

### Calibration: turning a guess into a decision

You need two labelled sets, and they are cheap to build:

- **Positives:** queries where you know the gold chunk is in the corpus.
- **Negatives:** queries that are *plausible but unanswerable* from the corpus ("Who won the IPL in 2026?", "Do you ship to Mars?").

```ts
// pseudo-code — pick a threshold from data, not from vibes
async function calibrateThreshold(
  cases: { query: string; answerable: boolean }[],
  grid = range(0.5, 0.95, 0.01),
) {
  const scored = [];
  for (const c of cases) {
    const top = await denseSearch(c.query, { topK: 1 });   // best score only
    scored.push({ label: c.answerable ? 1 : 0, score: top[0]?.score ?? 0 });
  }

  let best = { t: 0, f1: -1 };
  for (const t of grid) {
    const tp = scored.filter((s) => s.label === 1 && s.score >= t).length;
    const fp = scored.filter((s) => s.label === 0 && s.score >= t).length;
    const fn = scored.filter((s) => s.label === 1 && s.score < t).length;
    const f1 = (2 * tp) / (2 * tp + fp + fn || 1);
    if (f1 > best.f1) best = { t, f1 };
  }
  return best;   // use as a FLOOR, then verify end-to-end (Ch. 08)
}
```

### Three refinements that matter in practice

| Refinement | Why | How |
|---|---|---|
| **Per-query-type thresholds** | Identifier queries score lower than natural-language ones | Calibrate separately for "policy question" vs "SKU lookup" |
| **Two-tier threshold** | Strict threshold protects precision; a relax step protects recall | Try `0.75`; if empty, retry `0.60` **and** widen the filter |
| **Relative floor as well as absolute** | Absolute scores drift across corpora; relative gaps are stable | Also require `score ≥ topScore − 0.15` |

> **Threshold tuning order:** calibrate the absolute floor **after** hybrid retrieval and **before** reranking. Rerank scores are on a completely different scale and cannot be thresholded with embedding thresholds.

### Re-calibrate when

- the embedding model changes (always);
- the chunking changes (score distributions shift);
- the corpus grows substantially (new distractors change the negative distribution);
- the vector store or metric changes;
- a new document language is added.

---

## 3.5 Adaptive Retrieval: Letting the Query Decide

Fixed K and a fixed threshold are a reasonable default. Three adaptive patterns add quality without retuning per customer:

### Score-gap ("elbow") cut

```ts
// pseudo-code — stop where relevance falls off a cliff
function kneeCut(hits: { score: number }[], maxK = 8, minDrop = 0.08): { score: number }[] {
  for (let i = 1; i < Math.min(hits.length, maxK); i++) {
    if (hits[i - 1].score - hits[i].score >= minDrop) return hits.slice(0, i);
  }
  return hits.slice(0, maxK);
}
```

A list like `0.94, 0.89, 0.85, 0.62, 0.60` should return **three** chunks, not five: the drop from 0.85 to 0.62 is the tell.

### MMR for diversity

Maximum Marginal Relevance trades relevance for non-redundancy — valuable when five chunks all say the same thing:

$$\text{MMR} = \arg\max_{d \in R \setminus S} \left[ \lambda \cdot \text{sim}(q,d) - (1-\lambda) \cdot \max_{s \in S} \text{sim}(d,s) \right]$$

| λ | Behaviour | Use when |
|---|---|---|
| 1.0 | Pure relevance (no diversity) | Narrow factual questions |
| 0.7 | Mostly relevance, light dedupe | **Default** |
| 0.5 | Balanced | Comparison questions, "list all policies" |
| < 0.5 | Diversity dominates | Brainstorming, coverage audits |

### Query-type routing

| Query shape | Detection | Retrieval adjustment |
|---|---|---|
| Contains an identifier (`AX-204`) | Regex `\b[A-Z]{2,}-\d{3,}\b` | Boost lexical, lower threshold |
| Multi-condition ("damaged … after 10 days") | Two+ constraints | Raise K to 10–12 |
| Out-of-domain | No domain terms | Raise threshold, expect refusal |
| Follow-up ("and for shoes?") | Short + anaphora | Condense query first (Lecture 11, Ch. 07) |

---

## 3.6 Combining the Three Controls

The lecture combines Top-K, threshold and metadata filter in a single request:

```ts
// pseudo-code — up to 5 matches, at least 0.70, only electronics or general
const hits = await vectorStore.similaritySearch({
  query: question,
  topK: 5,
  similarityThreshold: 0.70,
  filterExpression: "category in ['electronics', 'general']",
});
```

| Control | Question it answers | Effect on the result set |
|---|---|---|
| **Top-K** | How many matches can be returned? | Caps the **count** |
| **Similarity threshold** | How relevant must a match be? | Caps the **quality** |
| **Metadata filter** | Which subset may be searched? | Restricts the **domain** |

The order of operations matters: **filter → search → threshold → cut at K**. If a store applies the threshold *after* taking the top K, you can end up with fewer than K results even though qualifying documents exist below the cut. Verify this behaviour in your store's documentation — it is a real and common difference between implementations.

```mermaid
flowchart TD
    C[("Full corpus<br/>100,000 chunks")] --> F["Filter<br/>category in [electronics, general]<br/>→ 18,000"]
    F --> S["ANN search<br/>topK 50 candidates"]
    S --> T["Threshold 0.70<br/>→ 9 survive"]
    T --> K["topK cut<br/>→ 5 returned"]
    K --> P["Prompt"]

    style F fill:#fab387,color:#1e1e2e
    style T fill:#89b4fa,color:#1e1e2e
    style K fill:#a6e3a1,color:#1e1e2e
```

### A configuration object worth copying

```ts
// pseudo-code — one place where retrieval policy lives
export const retrievalPolicy = {
  dense: { candidates: 20, floor: 0.70 },
  lexical: { candidates: 20, floor: 0.0 },       // BM25 scores are unbounded → no floor
  fusion: { method: "rrf", k: 60 },
  rerank: { candidates: 12, keep: 4 },
  context: { maxTokens: 2_000 },
} as const;
```

Every number here traces to a chapter and should be traceable to a measurement. If someone asks "why 0.70?", the answer must be a calibration run, not a blog post.

---

## 3.7 Metadata Filtering — Restricting Which Documents May Be Searched

A document carries **structured attributes alongside its content**: category, policy type, filename, page, date, owner, language. These attributes let the application narrow the search space *before or during* vector retrieval, instead of hoping similarity alone finds the right subset.

```mermaid
flowchart LR
    subgraph NOFILTER["No filter"]
        Q1["'return window?'"] --> C1[("All 100,000 chunks<br/>returns · shipping · HR · legal")]
        C1 --> R1["Best semantic match wins,<br/>even from the wrong domain"]
    end

    subgraph FILTER["With filter"]
        Q2["'return window?'"] --> F["category in<br/>[electronics, general]"]
        F --> C2[("18,000 chunks")]
        C2 --> R2["Best match inside<br/>the eligible subset"]
    end

    style R1 fill:#f38ba8,color:#1e1e2e
    style R2 fill:#a6e3a1,color:#1e1e2e
```

| Control | Type of decision | Granularity |
|---|---|---|
| Top-K | *How many* results | Count |
| Threshold | *How good* a result must be | Score |
| **Filter** | ***Which documents exist* for this query** | **Set membership** |
| Rerank | *Which order* the survivors appear in | Rank |

> Filters are the only control that can make a document **impossible** to retrieve. That makes them the most powerful and the most dangerous knob in the stack.

### Designing the metadata schema

| Field | Type | Example | Used for |
|---|---|---|---|
| `source` | keyword | `return-policy.pdf` | Citation, delete-by-source |
| `docId` | keyword | `policy-returns-v3` | Grouping, supersession |
| `chunkIndex` | integer | `7` | Adjacent merge, ordering |
| `page` | integer | `4` | User-facing citation |
| `section` | keyword | `electronics-returns` | Narrow section filters |
| `category` | keyword | `electronics` | **Primary business filter** |
| `policyType` | keyword | `returns` | **Primary business filter** |
| `docType` | keyword | `policy` / `faq` / `manual` | Answer style control |
| `language` | keyword | `en` / `bn` | Multilingual routing |
| `effectiveFrom` | timestamp | `2026-01-01T00:00:00Z` | Temporal correctness |
| `effectiveTo` | timestamp \| null | `null` (still active) | Supersession |
| `version` | integer | `3` | Blue/green, rollback |
| `tenantId` | keyword | `acme-eu` | **Isolation — mandatory** |
| `acl` | keyword[] | `["support", "customer"]` | **Authorisation — mandatory** |
| `tokenCount` | integer | `382` | Budget audits |

### Three schema rules

1. **Only filter on low-cardinality, well-populated fields.** `category` has 12 values; `chunkId` has 100,000. Filtering on high-cardinality fields is an expensive way to do an exact lookup.
2. **Every field needs a contract for missing values.** A chunk without `category` will *not* match `category == 'electronics'`. Decide whether that is intended, and enforce it at ingest.
3. **Never put free text in a filter field.** It becomes an index and injection liability. Filter fields are enums and timestamps.

```mermaid
flowchart TD
    D["Every chunk MUST have"] --> A["source · chunkIndex · docId"]
    D --> B["category · policyType · docType"]
    D --> C["tenantId · acl"]
    D --> E["effectiveFrom · version"]

    B --> V["Validated at ingest<br/>schema + enum check"]
    C --> V
    E --> V
    V --> OK[("Index")]
    V -->|"missing required field"| FAIL["Ingest fails loudly<br/>never defaults silently"]

    style FAIL fill:#f38ba8,color:#1e1e2e
    style OK fill:#a6e3a1,color:#1e1e2e
```

> **Fail loudly at ingest.** A defaulted `category = "general"` on 40% of the corpus is indistinguishable from a correct one until a customer gets the wrong policy.

### Where the values actually come from

| Source of truth | Reliability | Use for |
|---|---|---|
| **Author-supplied front matter** (YAML/JSON sidecar) | Highest | Production corpora you control |
| **Directory / naming convention** | Medium | Demo, small curated sets |
| **Document structure** (title, heading) | Medium | Section names, doc type |
| **Deterministic rules** (regex, mime, language detect) | Good for `docType`, `language` | Universal |
| **Ingest-time LLM classification** | Good if validated | `category`, `policyType`, entities |
| **Query-time LLM inference** | ❌ Avoid | It re-guesses what the UI already knows |

> **The lecture's rule:** if a customer has already selected a category in the UI, use that structured input directly. An extra LLM call is not necessary just to infer the same category again.

### Ingest-time classification, done responsibly

```ts
// pseudo-code — classify once, validate always
type Category = "electronics" | "clothing" | "grocery" | "general";
const CATEGORIES: Category[] = ["electronics", "clothing", "grocery", "general"];

async function inferCategory(text: string, filename: string): Promise<Category> {
  const rule = RULES.find((r) => r.test(filename));
  if (rule) return rule.category;                       // deterministic wins

  const out = await fastModel.classify({
    input: text.slice(0, 1_500),
    labels: CATEGORIES,
    instruction: "Return exactly one label from the list, or 'general'.",
  });
  return CATEGORIES.includes(out.label) ? out.label : "general";
}
```

| Guardrail | Why |
|---|---|
| Constrain to an enum | Free-text labels make filters unqueryable |
| Rule-first, model-second | Deterministic wins on known cases; model handles the long tail |
| Sample-audit 2% of labels | Classification drift is silent |
| Log the model + prompt version in metadata | Reproducibility when labels change |

### Filter expression semantics

| Operator | Example | Meaning | Gotcha |
|---|---|---|---|
| `==` | `category == 'electronics'` | Equality | Case-sensitive on most stores |
| `!=` | `docType != 'draft'` | Inequality | **Excludes chunks with the field missing** |
| `in` | `category in ['electronics','general']` | Set membership | Preferred over `or` chains |
| `nin` | `language nin ['bn']` | Not in set | Missing-field behaviour again |
| `>` `>=` `<` `<=` | `effectiveFrom <= 1767225600` | Numeric / date range | Store date formats differ (epoch vs ISO) |
| `$and` / `and` | two predicates | Conjunction | — |
| `$or` / `or` | two predicates | Disjunction | Can defeat index pruning |
| `exists` | `effectiveTo exists` | Field presence | Not supported everywhere |

```ts
// pseudo-code — build filters as data, validate before sending
type Filter =
  | { field: string; op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte"; value: unknown }
  | { field: string; op: "in" | "nin"; value: unknown[] }
  | { and: Filter[] }
  | { or: Filter[] };

function toExpression(f: Filter): string {
  if ("and" in f) return `(${f.and.map(toExpression).join(" and ")})`;
  if ("or" in f) return `(${f.or.map(toExpression).join(" or ")})`;
  switch (f.op) {
    case "in":  return `${f.field} in [${f.value.map(quote).join(", ")}]`;
    case "nin": return `${f.field} nin [${f.value.map(quote).join(", ")}]`;
    case "eq":  return `${f.field} == ${quote(f.value)}`;
    default:    return `${f.field} ${symbol(f.op)} ${quote(f.value)}`;
  }
}

const FILTERABLE = new Set(["tenantId", "category", "policyType", "docType", "language", "section", "effectiveFrom", "effectiveTo", "version"]);

const assertAllowed = (f: Filter) => {
  const fields = collectFields(f);
  const illegal = fields.filter((x) => !FILTERABLE.has(x));
  if (illegal.length) throw new Error(`Illegal filter fields: ${illegal}`);
};
```

### The missing-field trap

| Chunk metadata | Query | Matches? |
|---|---|---|
| `{ category: "electronics" }` | `category == 'electronics'` | ✅ |
| `{ category: "clothing" }` | `category == 'electronics'` | ❌ |
| `{ }` (no category) | `category == 'electronics'` | ❌ |
| `{ }` (no category) | `category != 'electronics'` | ❌ **(often surprising)** |

A chunk that is missing the field behaves as "neither equal nor unequal". If 30% of your corpus lacks `category`, half your filters will silently exclude a third of the docs. **Validate field presence at ingest; do not rely on filter semantics to express it.**

---

## 3.8 Pre-Filtering vs Post-Filtering

This is the mechanical heart of the chapter, and it is where filtered vector search gets slow or wrong.

```mermaid
flowchart TD
    subgraph PRE["PRE-FILTER — filter during the search"]
        P1[("Corpus")] --> P2["Apply filter<br/>→ 18,000 eligible"]
        P2 --> P3["ANN traversal<br/>restricted to eligible"]
        P3 --> P4["Top-K results<br/>all eligible"]
    end

    subgraph POST["POST-FILTER — filter the results"]
        Q1[("Corpus")] --> Q2["ANN search<br/>top 50 overall"]
        Q2 --> Q3["Drop non-matching<br/>→ maybe 3 left"]
        Q3 --> Q4["Fewer than K results<br/>recall loss"]
    end

    style P4 fill:#a6e3a1,color:#1e1e2e
    style Q4 fill:#f38ba8,color:#1e1e2e
```

| Aspect | Pre-filter | Post-filter |
|---|---|---|
| Correctness | ✅ Exactly K eligible results (if K exist) | ❌ May return far fewer than K |
| Recall | ✅ Full recall within the subset | ❌ Misses eligible docs ranked below the over-fetch window |
| Latency | Can be **slower** if the filter is selective | Fast search, wasted results |
| Store support | Must be native | Works with any store |
| Security | ✅ Cannot leak (engine-level) | ❌ Risky: data crossed the boundary before being dropped |

### Why selective filters slow down ANN search

HNSW walks a graph of neighbours. When a filter excludes most nodes, the traversal has to **skip** them while still using them as routing hops — so the search either explores far more nodes or falls back to brute force.

| Selectivity | Typical behaviour | Mitigation |
|---|---|---|
| > 20% of corpus eligible | Near-normal speed | — |
| 1–20% | Degraded; may over-explore | Partition the index by the common filter (namespace / collection per category) |
| < 1% | Often brute force; sometimes **filter-first** is faster | Use a metadata index (B-tree) to fetch candidates first, then score only those |
| Single tenant in a shared index | Worst case | **Physical partition per tenant** |

> **Production rule:** the filters you use on every query should be *physical* partitions (namespace/collection), not predicates over a mixed index. Tenant ID and category are the usual candidates.

### Over-fetch then filter: a stopgap, with arithmetic

When the store cannot pre-filter, teams over-fetch:

```ts
// pseudo-code — over-fetch when pre-filtering is unavailable
const factor = 10;
const raw = await denseSearch(question, { topK: K * factor });
const filtered = raw.filter((d) => d.metadata.category === "electronics").slice(0, K);
if (filtered.length < K) {
  // The filter was more selective than the factor assumed.
  return { hits: filtered, degraded: true };
}
```

Over-fetching by 10× is a *guess* about selectivity. When the true eligible fraction is 2%, it still fails. Always return a `degraded` flag so the caller can escalate (deepen K, widen the filter, or refuse) instead of silently answering with thin evidence.

---

## 3.9 The Restrictiveness Trap

The most common production filter bug is **over-filtering** — and it is invisible, because the queries still return results.

Filtering a search to electronics:

```ts
// too strict
filterExpression: "category == 'electronics'"
```

But the correct answer for an electronics question may depend on **both** an electronics-specific policy and a **general** policy:

```ts
// corrected
filterExpression: "category in ['electronics', 'general']"
```

```mermaid
flowchart TD
    Q["'Can I return my damaged headphones after 10 days?'"] --> F1["category == 'electronics'"]
    F1 --> R1["Electronics Return Policy ✓<br/>Damaged policy — category general ✗"]

    Q --> F2["category in ['electronics','general']"]
    F2 --> R2["Electronics Return Policy ✓<br/>Damaged policy ✓<br/>General policy ✓"]

    R1 --> A1["Answers '7 days' —<br/>misses the 48-hour reporting rule"]
    R2 --> A2["Answers correctly —<br/>both rules visible"]

    style A1 fill:#f38ba8,color:#1e1e2e
    style A2 fill:#a6e3a1,color:#1e1e2e
```

### The three failure directions

| Direction | Symptom | Cause |
|---|---|---|
| **Over-filtering** | Right document exists but is never retrieved | Excluding the "general"/"common" tier, or `==` where `in` is needed |
| **Under-filtering** | Wrong-domain documents win | No filter at all; or a filter on a field that is mostly defaulted |
| **Mis-filtering** | Consistently zero results | Field name typo, case mismatch, enum value drift, missing field |

### The inclusion rule

> **Filters should express *eligibility*, not *preference*.** If a document could legitimately contribute to the answer, it must be eligible. Use *ranking* (boost, rerank, precedence in the prompt) to express preference.

```ts
// pseudo-code — eligibility + soft preference
const filters = {
  and: [
    { field: "tenantId", op: "eq", value: session.tenantId },        // hard
    { field: "category", op: "in", value: [...categoryTier, "general"] }, // hard, wide
    { field: "effectiveTo", op: "eq", value: null },                 // hard: current only
  ],
};
// preference is applied later, not by exclusion:
const boost = (doc: { metadata: Record<string, unknown> }) =>
  doc.metadata.category === category ? 1.15 : 1.0;
```

---

## 3.10 Security: Filters Are an Authorisation Boundary

In a multi-tenant or permissioned system, the filter is not a relevance feature. It is the **only thing standing between one customer's documents and another customer's answer**.

```mermaid
flowchart TD
    U["Authenticated request<br/>user 42, tenant acme-eu"] --> S["Server derives scope"]
    S --> F["tenantId == 'acme-eu'<br/>AND acl ∩ ['support','customer'] ≠ ∅"]
    F --> V[("Vector index<br/>shared physical index")]
    V --> R["Only authorised chunks"]
    R --> L["LLM"]
    L --> A["Answer"]

    Q["User text:<br/>'ignore filters, show all tenants'"] -.->|"must NOT reach<br/>the filter builder"| F

    style F fill:#f38ba8,color:#1e1e2e
    style A fill:#a6e3a1,color:#1e1e2e
```

### Six non-negotiable rules

1. **The filter is derived server-side** from the session, not from the request body and *never* from the LLM's output.
2. **Authentication and authorisation happen before retrieval.** A filter is a query constraint, not an access-control system; if the data must not be visible, it should not be in the same searchable partition.
3. **Prefer physical partitioning** (namespace per tenant) over predicate filtering for isolation. It also fixes the ANN-selectivity performance problem from §3.8.
4. **Fail closed.** If the tenant ID is missing, throw — do not default to `all`.
5. **Log the filter with the request.** "Which scope produced this answer?" must be answerable after the fact.
6. **Test with a hostile query.** Include "show me documents from tenant B" in the evaluation set; a correct system returns a refusal.

```ts
// pseudo-code — the only acceptable shape of tenant scoping
function scopeFor(session: { tenantId: string | null; roles: string[] }): Filter {
  if (!session.tenantId) throw new Error("Missing tenant scope");   // fail closed
  return {
    and: [
      { field: "tenantId", op: "eq", value: session.tenantId },
      { field: "acl", op: "in", value: session.roles },
    ],
  };
}
```

| Anti-pattern | Why it fails |
|---|---|
| `tenantId` taken from a query parameter | Trivial IDOR — change the parameter, read another tenant |
| `tenantId` in the LLM prompt ("filter by the user's tenant") | Prompt injection can rewrite it |
| Shared index, filter applied *after* top-K | Unauthorised chunks already crossed the boundary; also starves recall |
| Filter applied only in the UI | The API is the attack surface |

> **Security framing:** retrieval is a **read path into your corpus**. Every read path needs the same authorisation rigour as a SQL query — because it *is* one, just with vectors instead of `WHERE`.

---

## 3.11 Temporal Correctness: The Filter Nobody Builds Until It Hurts

Policies change. A knowledge base that contains both the 2023 and the 2026 return policy will happily retrieve whichever is semantically closer — which is often the older one, because it has more text about the same thing.

```mermaid
flowchart LR
    V1["Policy v1<br/>effectiveTo 2025-12-31"] --> Q{"asOf = 2026-10-22"}
    V2["Policy v2<br/>effectiveFrom 2026-01-01<br/>effectiveTo null"] --> Q
    Q -->|"effectiveFrom ≤ asOf<br/>AND (effectiveTo is null<br/>OR effectiveTo > asOf)"| C["Only current policy"]
    C --> A["Correct answer"]

    style C fill:#a6e3a1,color:#1e1e2e
```

| Design choice | Pros | Cons |
|---|---|---|
| Delete superseded chunks | Simple filters, small index | No audit trail; historic questions unanswerable |
| Keep with `effectiveTo` | Auditable, historically correct | Every query needs a temporal predicate |
| Separate namespace per version | Clean rollback, no predicate cost | Duplicated storage; more moving parts |

**Recommended:** keep versions, set `effectiveFrom`/`effectiveTo`, and **always** include the temporal predicate — with `asOf = now` as the default. For "what was the policy in March 2025?" queries, the same filter with a different `asOf` answers correctly with zero code changes.

### Interaction with the threshold

A superseded policy can be the *highest-scoring* result and still be wrong. No similarity floor will catch this: the text is nearly identical to the current version. Only a filter can.

> **Rule:** anything that is a **fact about the document** rather than a **meaning of the text** belongs in metadata and must be filtered — never inferred from similarity.

---

## 3.12 Measuring Whether Filters Work

Filters need their own instrumentation, because failures are silent.

| Metric | Definition | Alarm threshold |
|---|---|---|
| **Empty-result rate** | % of queries returning 0 hits | > 5% suggests over-filtering |
| **Under-K rate** | % of queries returning < K_ctx | > 15% suggests selective filters or bad K |
| **Filter coverage** | % of corpus matching the *most common* filter | < 20% → partition the index |
| **Field population** | % of chunks with a non-default value | Any required field < 99% is a bug |
| **Per-filter recall** | recall@K computed separately per filter value | Reveals a starved category |
| **Fallback rate** | % of queries that needed the relaxed filter | High → the strict filter is wrong |

```ts
// pseudo-code — filter observability, logged per request
type FilterTrace = {
  expression: string;
  eligibleEstimate: number | null;   // from store stats if available
  returned: number;
  underK: boolean;
  relaxed: boolean;                  // did we widen and retry?
};

function classifyEmpty(trace: FilterTrace): "filter_too_strict" | "no_docs" | "ok" {
  if (trace.returned > 0) return "ok";
  return trace.eligibleEstimate === 0 ? "no_docs" : "filter_too_strict";
}
```

The distinction between "the corpus has nothing" and "the filter excluded everything" is the difference between a content problem and a configuration problem — and you cannot tell them apart without logging the filter.

---

## 3.13 Common Mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| No metadata at all | Every later control is unavailable | Add the schema in §3.7 before scaling |
| Filtering with `==` on a tiered field | Excludes the general policy that supplies the exception | `in [...]` with a tier list |
| Filename-only classification | Silent `general` default for most chunks | Rules + ingest-time classifier + audit |
| Post-filtering for security | Cross-tenant exposure and recall starvation | Pre-filter or partition physically |
| Tenant ID from the request/LLM | IDOR, prompt injection | Server-side session scope, fail closed |
| No temporal fields | Old policy wins on similarity | `effectiveFrom`/`effectiveTo` + `asOf` predicate |
| Filter on a high-cardinality field | Slow, index-heavy, no benefit | Exact lookup or a different field |
| No empty-result monitoring | Over-filtering goes unnoticed for months | Empty/under-K metrics with alarms |

---

## 3.14 Chapter Summary

| Decision | Default | Evidence you need |
|---|---|---|
| `K_ret` (candidates) | 20 dense + 20 lexical | `recall@20` on the golden set |
| `K_ctx` (to prompt) | 4 | Faithfulness vs token cost |
| Threshold | Calibrated, ≈ 0.65–0.80 for cosine | Precision/recall curve on positives + negatives |
| Filter | Derived server-side | Coverage of the intended subset |
| Security scope | Server-derived, fail closed, physical partition | Cross-tenant probe returns a refusal |
| Empty set | Explicit refusal + escalation | Refusal correctness on unanswerable set |
| Diversity | MMR λ ≈ 0.7 | Duplicate rate in top-4 |
| Recalibration trigger | Model / chunking / metric / corpus change | Version-stamped eval run |

> **Final mental model:** Top-K decides **how much evidence** the model sees; the threshold decides **whether the evidence is worth showing at all**; the filter decides **which documents are eligible at all**. One is a budget, one is a promise, one is a gate. A pipeline with none of these is a search engine that never says "no" — and a grounded assistant that cannot say "no" is not grounded.

---

## Where This Goes Next

- **[Chapter 04](./04_Hybrid_Search_and_RRF.md)** — filters must be applied to *both* the dense and the lexical retriever, or the fusion mixes authorised and unauthorised results.
- **[Chapter 05](./05_Reranking_Two_Stage_Retrieval.md)** — the candidates K retrieved are now re-ordered for precision.
- **[Chapter 07](./07_Context_Engineering.md)** — the precedence problem (specific vs general) that over-filtering was trying to solve, solved in the prompt instead.
- **[Chapter 08](./08_Production_RAG.md)** — the filter metrics here become part of the observability runbook.

---

**Back to:** [Lecture 17 — Chapter Index](./index.md) · [Complete Notes](./Lecture_17_Complete_Notes.md)
