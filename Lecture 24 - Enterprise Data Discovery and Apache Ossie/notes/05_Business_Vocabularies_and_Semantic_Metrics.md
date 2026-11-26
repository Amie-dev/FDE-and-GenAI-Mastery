# Chapter 05 — Business Vocabularies & Semantic Metrics

> **Lecture 24 · Chapter 05 of 07** · Level: 🟠 Advanced · Phase 6 — Enterprise Data, Semantics & SQL
> **Source:** `FDE S10` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-24--enterprise-data-discovery-ontologies--apache-ossie)
> **Roadmap topics:** Business glossaries · semantic metric definitions (ARR, Churn, Active User) · preventing LLM metric hallucination · versioned metric contracts.

---

## 05.0 What this chapter is for

Ask two teams in an enterprise *"What is our ARR?"* or *"How many active customers do we have?"* and you will get two different numbers:
- **Sales** counts signed contracts including future start dates.
- **Finance** counts recognized recurring revenue excluding one-time onboarding fees and churned/past-due accounts $> 30$ days.

If you give an AI agent raw SQL access without a **Business Vocabulary & Semantic Metric Registry**, the LLM will *invent* its own `SUM(amount)` formula — producing plausible, confident, **wrong** executive numbers.

By the end of this chapter you should be able to:

1. Define a **Business Vocabulary** mapping ambiguous human terms (`"active customer"`, `"ARR"`, `"churn"`) to exact canonical definitions.
2. Author machine-readable **Semantic Metric Definitions** (numerator, denominator, filters, grain, authoritative table, owner).
3. Ground agent queries in the metric registry so the agent **never guesses** a business formula.

---

## 05.1 Anatomy of a semantic metric definition

Every business metric in the catalogue should be stored as a structured, versioned contract:

| Field | Example (`net_arr`) | Why It Prevents Agent Hallucination |
| :--- | :--- | :--- |
| **`id` & `synonyms`** | `net_arr` (`["ARR", "Annual Recurring Revenue"]`) | Resolves natural-language variations to one canonical metric |
| **`formulaSql`** | `SUM(mrr_cents * 12) / 100.0` | Eliminates LLM-invented math (e.g., forgetting to exclude one-time fees) |
| **`requiredFilters`** | `["status = 'active'", "is_internal_test = false"]` | Prevents counting test/canceled accounts |
| **`authoritativeAsset`** | `billing.subscriptions` (via `mart.dim_subscriptions`) | Forces the agent to query the certified source |
| **`ownerTeam`** | `@finance-revops` | Clear escalation path when definitions change |

```mermaid
flowchart LR
    Q["User: 'What is Acme ARR?'"] --> Vocab["Business Vocabulary Lookup<br/>('ARR' -> metric: net_arr)"]
    Vocab --> Def["Metric Contract:<br/>Table: billing.subscriptions<br/>Filter: status = 'active'"]
    Def --> Query["Grounded Query / Tool Call<br/>(Zero Formula Guessing)"]
```

### Worked Example: Why Semantic Contracts Stop \$60,000 Hallucinations
Suppose `billing.subscriptions` for **Acme** has 3 rows:
- Row 1: `plan = "enterprise"`, `mrr_cents = 1000000` (`$10,000/mo`), `status = "active"`, `is_internal_test = false`
- Row 2: `plan = "sandbox_qa"`, `mrr_cents = 500000` (`$5,000/mo`), `status = "active"`, `is_internal_test = true`
- Row 3: `plan = "starter"`, `mrr_cents = 100000` (`$1,000/mo`), `status = "canceled"`, `is_internal_test = false`

- **Without Metric Contract:** An unguided LLM writes `SELECT SUM(mrr_cents * 12) / 100 FROM billing.subscriptions` $\rightarrow$ **`$192,000` (wrong by `$72,000`!)**.
- **With `net_arr` Contract (`requiredFilters: ["status = 'active'", "is_internal_test = false"]`):** Excludes Row 2 (QA test) and Row 3 (canceled) $\rightarrow$ **`$120,000` (100% finance-accurate)**.

---

## 05.2 Key takeaways

1. **Never let an LLM invent metric definitions** from column names alone.
2. **Store synonyms, exact formulas, required filters, and certified tables** in a queryable Business Vocabulary.
3. **Treat metric definitions as versioned code** owned by domain stewards (`@finance-revops`, `@product-analytics`).

---

**Next:** [Chapter 06 — Source Precedence & Knowledge Provenance](./06_Source_Precedence_and_Knowledge_Provenance.md)

