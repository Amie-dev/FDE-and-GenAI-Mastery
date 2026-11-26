# Lecture 32 - Durable Execution (Inngest) & Event-Driven CDC Workflows

> **Phase:** 8 · Production Infra · **Level:** 🟠 Advanced
> **Source:** `GAC D13 · roadmap-v1.md (S16 · Moved from Old L26)`

---

## 📍 Where this lecture sits

See **[../roadmap-v1.md](../roadmap-v1.md)** → *"Lecture 32 — Durable Execution (Inngest) & Event-Driven CDC Workflows"* for the **complete topic list**,
the **goal**, the **build task** and the **release gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 32 | ☑ |
| Write my own chapter notes in `notes/` | ☑ (01–09) |
| Build / rebuild the code in `code/` | ☑ |
| Pass the lecture's completion gate | ☐ |

## 📁 Layout

```text
Lecture 32 - Durable Execution with Inngest/
├── README.md          # this file — objectives · phase · level · source mapping · checklist
├── index.md           # chapter index (filled by prompt.md → Block 6)
├── prompt.md          # generation prompt (git-ignored) — change the chapter number, run it block by block
├── .gitignore         # ignores prompt.md
├── notes/             # chapter notes, written from the source notes
├── code/              # the rebuilt codebase (Basic Code · Production Code + implementation guides)
└── Assignment/
    └── task.md        # the lecture assignment (filled by prompt.md → Block 5)
```

## 🧠 My notes

1. [01 — Inngest Fundamentals & Async Architecture](./notes/01-inngest-fundamentals-and-async-architecture.md)
2. [02 — Procedural Code vs Event-Driven Multi-Agent Orchestration](./notes/02-procedural-code-vs-event-driven.md)
3. [03 — Traditional Queues vs Inngest](./notes/03-traditional-queues-vs-inngest.md)
4. [04 — Inngest Durable Execution SDK & Steps API](./notes/04-inngest-sdk-steps-api.md)
5. [05 — Parallel Multi-Agent Fan-Out / Fan-In](./notes/05-parallel-multi-agent-fan-out-fan-in.md)
6. [06 — Concurrency, Throttling & Rate Limiting](./notes/06-concurrency-throttling-and-rate-limiting.md)
7. [07 — Error Resilience, Observability & Dead Letter](./notes/07-error-resilience-observability.md)
8. [08 — Cron Scheduled Workflows, Versioning & Advanced](./notes/08-cron-versioning-advanced.md)
9. [09 — CDC Pipelines, Idempotency & DLQ Replay](./notes/09-cdc-idempotency-and-dlq-replay.md)
- **Complete consolidation:** [notes/Lecture_32_Complete_Notes.md](./notes/Lecture_32_Complete_Notes.md) · **Index:** [index.md](./index.md)

## 🔗 Source references

`GAC D13` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.
