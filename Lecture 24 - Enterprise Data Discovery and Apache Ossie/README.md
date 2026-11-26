# Lecture 24 - Enterprise Data Discovery and Apache Ossie

> **Stage 2: Connect** · **Phase:** 6 · Enterprise Data, Semantics & SQL · **Level:** 🟠 Advanced
> **Source:** `FDE S09 & S10` · **Master Map:** [`roadmap-v1.md`](../roadmap-v1.md)

---

## 🎯 Learning Goal

Discover and map enterprise data estates, define canonical entities and business vocabularies, enforce source-of-truth precedence, and build metadata-aware AI with Apache Ossie.

| Navigation | Links |
| :--- | :--- |
| **Prerequisites** | [Lecture 20](../Lecture%2020%20-%20Advanced%20RAG/) · [Lecture 23](../Lecture%2023%20-%20Graph%20Databases%20and%20GraphRAG/) |
| **Unlocks** | [Lecture 25](../Lecture%2025%20-%20AI%20Data%20Contracts%20and%20Lakehouse%20Lifecycle/) · [Lecture 26](../Lecture%2026%20-%20Semantic%20Text-to-SQL%20and%20Analytical%20Python/) |

---

## 📚 Planned Chapter Syllabus (`notes/`)

Write one markdown file per chapter inside `notes/`, followed by `notes/Lecture_24_Complete_Notes.md`:

| # | Planned Chapter | Key Topics to Cover |
| :---: | :--- | :--- |
| **01** | **Mapping Enterprise Data Estates** | Warehouses, operational DBs, SaaS APIs, data lakes, and shadow spreadsheets. |
| **02** | **Metadata Discovery, Ownership & Lineage** | Automated schema crawling, table ownership, upstream/downstream lineage, and ACLs. |
| **03** | **Synthetic Data Environments for Safe Dev** | Generating privacy-preserving synthetic datasets mirroring production schemas. |
| **04** | **Canonical Entities & Cross-System Identity** | Resolving `customer_id` across CRM, Billing, and Support systems. |
| **05** | **Business Vocabularies & Semantic Metrics** | Defining authoritative metrics (ARR, Churn, Active User) so agents never guess. |
| **06** | **Source Precedence & Knowledge Provenance** | Resolving conflicting records using system-of-record precedence rules. |
| **07** | **Apache Ossie & Metadata-Aware AI** | Integrating open metadata catalogues and semantic context directly into agent prompts. |

---

## 🛠️ What You Will Build (`code/`)

A **Metadata Catalogue & Canonical Entity Resolver** (`code/`): ingests schemas from two mock systems (CRM + Billing), resolves canonical customer identities, and exposes lineage + precedence metadata to an agent.

---

## 🏁 Release Gate (`Assignment/task.md`)

To mark **Lecture 24** complete, verify all of the following:

Given conflicting customer status fields across CRM and Billing, the agent queries metadata precedence rules and cites the authoritative source of truth 100% of the time.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Review syllabus & reference links below | ✅ |
| Write all chapter notes + `Lecture_24_Complete_Notes.md` in `notes/` | ✅ |
| Update `index.md` with links to every chapter | ✅ |
| Build & test the runnable implementation in `code/` | ✅ |
| Write & pass the completion gate in `Assignment/task.md` | ✅ |

---

## 📁 Layout

```text
Lecture 24 - Enterprise Data Discovery and Apache Ossie/
├── README.md          # this blueprint — goal · syllabus · build · gate · references
├── index.md           # chapter index (fill after writing notes/)
├── notes/             # chapter notes + Lecture_24_Complete_Notes.md
├── code/              # runnable TypeScript / Python / Infra implementation
└── Assignment/
    └── task.md        # hands-on assignment & release gate checklist
```

---

## 🔗 References & Resources

- [OpenMetadata / Data Catalog Concepts](https://docs.open-metadata.org/)
- [Apache Iceberg & Lakehouse Metadata](https://iceberg.apache.org/)
- See [`../task.md`](../task.md) for the ready-to-run generation prompt for **Lecture 24**.
