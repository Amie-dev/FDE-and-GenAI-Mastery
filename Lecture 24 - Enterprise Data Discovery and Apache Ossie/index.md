# Lecture 24 — Chapter Index

**Enterprise Data Discovery, Ontologies & Apache Ossie**
Phase 6 · Enterprise Data, Semantics & SQL · 🟠 Advanced · **7 chapters**

> Source of truth for topics, goal, build task and gate: **[../roadmap-v1.md](../roadmap-v1.md)** → *"Lecture 24"*.
> Source mapping: `FDE S09 & S10`.

---

## 📚 Chapters

| # | Chapter | One-line summary | File |
| :---: | :--- | :--- | :--- |
| 01 | **Mapping Enterprise Data Estates** | Five estate tiers (OLTP, Warehouse, SaaS APIs, Docs, Shadow), freshness vs. safety, Data Estate Inventory | [01_Mapping_Enterprise_Data_Estates.md](./notes/01_Mapping_Enterprise_Data_Estates.md) |
| 02 | **Metadata Discovery, Ownership & Lineage** | Technical/business/operational metadata, upstream/downstream lineage DAGs, PII propagation & column ACLs | [02_Metadata_Discovery_Ownership_and_Lineage.md](./notes/02_Metadata_Discovery_Ownership_and_Lineage.md) |
| 03 | **Synthetic Data Environments for Safe Dev** | Deterministic pseudonymization, preserving cross-system joins, seeded adversarial conflict & null injection | [03_Synthetic_Data_Environments_for_Safe_Dev.md](./notes/03_Synthetic_Data_Environments_for_Safe_Dev.md) |
| 04 | **Canonical Entities & Cross-System Identity** | Vendor-neutral canonical entities, tiered matching (exact key, normalized natural key, steward-reviewed fuzzy), crosswalks | [04_Canonical_Entities_and_Cross_System_Identity.md](./notes/04_Canonical_Entities_and_Cross_System_Identity.md) |
| 05 | **Business Vocabularies & Semantic Metrics** | Glossary synonyms, machine-readable metric contracts (`net_arr`), required filters, preventing LLM formula guessing | [05_Business_Vocabularies_and_Semantic_Metrics.md](./notes/05_Business_Vocabularies_and_Semantic_Metrics.md) |
| 06 | **Source Precedence & Knowledge Provenance** | Field-level System-of-Record precedence (`billing > crm`), deterministic conflict resolution, provenance citations | [06_Source_Precedence_and_Knowledge_Provenance.md](./notes/06_Source_Precedence_and_Knowledge_Provenance.md) |
| 07 | **Apache Ossie & Metadata-Aware AI** | Open metadata catalogue + ontology + precedence integration, progressive metadata injection, ACL-filtered retrieval | [07_Apache_Ossie_and_Metadata_Aware_AI.md](./notes/07_Apache_Ossie_and_Metadata_Aware_AI.md) |

---

## 📄 Complete notes

A single consolidated document with the executive summary, architecture diagram, cheat sheet, and self-check questions:

👉 **[Lecture_24_Complete_Notes.md](./notes/Lecture_24_Complete_Notes.md)**

---

## 🔗 Related

- **[./code/Basic Code](./code/Basic%20Code)** — runnable TypeScript Metadata Catalogue + Canonical Entity Resolver + Precedence Agent, release-gate tests, and chapter-wise `implementations guide/`
- **[./Assignment/task.md](./Assignment/task.md)** — hands-on assignment & release gate checklist
- **[./README.md](./README.md)** — lecture objectives, phase, level, source mapping and checklist
- **[../roadmap-v1.md](../roadmap-v1.md)** — complete topic list, goal, build task and completion gate

---

## 🧭 Reading order

```mermaid
flowchart LR
    C1["01 Data Estates"] --> C2["02 Metadata & Lineage"]
    C2 --> C3["03 Synthetic Data"]
    C3 --> C4["04 Canonical Entities"]
    C4 --> C5["05 Business Vocabulary"]
    C5 --> C6["06 Source Precedence"]
    C6 --> C7["07 Apache Ossie AI"]
    C7 --> N["Complete Notes"]
```

