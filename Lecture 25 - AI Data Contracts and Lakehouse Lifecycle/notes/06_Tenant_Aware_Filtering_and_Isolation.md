# Chapter 06 — Tenant-Aware Filtering & Isolation

> **Lecture 25 · Chapter 06 of 07** · Level: 🟠 Advanced · Phase 6 — Enterprise Data, Semantics & SQL
> **Source:** `FDE S12` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-25--ai-data-contracts-lakehouse-storage--knowledge-lifecycle)
> **External Reference:** [Qdrant Multitenancy Guide](https://qdrant.tech/documentation/guides/multiple-partitions/)
> **Roadmap topics:** Multi-tenant vector & graph isolation · mandatory `tenant_id` pre-filtering · shared index + payload index vs. per-tenant collections · preventing cross-tenant RAG leakage.

---

## 06.0 What this chapter is for

In a multi-tenant B2B AI product, **cross-tenant data leakage is a company-ending security incident**. If Tenant A asks *"What is our Q4 discount policy?"* and your vector search accidentally retrieves Tenant B's pricing chunk, no prompt instruction can save you.

By the end of this chapter you should be able to:

1. Enforce **mandatory `tenant_id` pre-filtering** at the database/vector-index boundary (never post-filtering in application memory).
2. Compare **shared partitioned collections** vs. **per-tenant collections** vs. **dedicated clusters**.
3. Enforce **retention & TTL policies** per tenant so expired data is automatically purged.

---

## 06.1 Multi-tenant storage trade-offs

| Pattern | Isolation Strength | Operational Cost | Best For |
| :--- | :---: | :---: | :--- |
| **1. Shared Index + Mandatory `tenant_id` Filter** | Logical (enforced in query layer) | Low | 1,000+ SMB tenants; Qdrant payload index / Postgres RLS |
| **2. Per-Tenant Collection / Schema** | Strong namespace isolation | Medium | 10–500 mid-market tenants with custom retention |
| **3. Dedicated Cluster / VPC** | Physical isolation | High | Regulated enterprise / healthcare / sovereign tenants |

> [!CAUTION]
> **Never post-filter top-K vector results by `tenant_id`!** If you fetch global `topK = 5` and then filter in TypeScript for `tenantId === "t1"`, 4 of the 5 results might belong to `t2` — leaving `t1` with 1 (or 0!) results and leaking `t2` vectors into app memory. Always pass `filter: { tenantId }` **inside** the vector query.

---

## 06.2 Key takeaways

1. **Require `tenantId` on every write and every query** at the store interface level (type-checked, not optional).
2. **Pre-filter inside the vector/SQL/graph engine** — never post-filter top-K results.
3. **Attach `retentionDays` / `expiresAt`** per tenant to automate compliance purging.

---

**Next:** [Chapter 07 — Zero-Downtime Re-Embedding, Versioning & Migrations](./07_Zero_Downtime_Re_Embedding_and_Migrations.md)

