# 📝 Lecture 25 — Assignment & Release Gate

**AI Data Contracts, Lakehouse Storage & Knowledge Lifecycle**
Phase 6 · Enterprise Data, Semantics & SQL · 🟠 Advanced · **Estimated effort: 5–7 hours**

> **Read first:** the seven chapters in **[../notes](../notes)** (index: **[../index.md](../index.md)**).
> The lecture's **goal**, **build task**, and **release gate** live in **[../README.md](../README.md)** and **[../../roadmap-v1.md](../../roadmap-v1.md)** → *Lecture 25*.

---

## 🎯 What this assignment tests

| Weight | Part | What it tests | Output |
| :---: | :--- | :--- | :--- |
| **30%** | **A** — Chapter-wise practice | Can you design hybrid pipelines, Zod contracts, GDPR cascades, and Blue/Green migrations | Written answers (`A1`–`A7`) |
| **35%** | **B** — Code & Implementation Guide | Can you build & walk through `code/Basic Code/` + `implementations guide/` | `../code/Basic Code` |
| **20%** | **C** — Release Gate Verification | Does cascade delete leave 0 artifacts & Blue/Green swap run with zero downtime | `npm test` (5/5 green) |
| **15%** | **D** — Spoken / Written Defense | Can you defend every lifecycle decision in 2–3 sentences | 4 short answers |

---

## Part A — Chapter-wise practice

1. **A1 (Chapter 01):** Which ingestion steps belong in deterministic code vs. System-1 LLM calls, and why?
2. **A2 (Chapter 02):** Why should an ingestion pipeline quarantine invalid records in an `ExceptionQueue` instead of crashing the batch?
3. **A3 (Chapter 03):** List the four stores tracked in a Derived-Artifact Lineage Ledger for a single source document.
4. **A4 (Chapter 04):** Explain what "zombie resurrection" is during a GDPR delete and how tombstones prevent it.
5. **A5 (Chapter 05):** Contrast Bronze, Silver, and Gold layers in an AI Lakehouse pipeline.
6. **A6 (Chapter 06):** Why is post-filtering `topK` vector results by `tenantId` in application memory both a security and a recall bug?
7. **A7 (Chapter 07):** Walk through the 4 steps of a Blue/Green re-embedding migration from `1536d` to `3072d`.

---

## Part B — `code/Basic Code/` & `implementations guide/`

Inspect, run, and extend [`../code/Basic Code/`](../code/Basic%20Code/) alongside its chapter-wise [`implementations guide/`](../code/Basic%20Code/implementations%20guide/):

- [ ] Read [`00_Overview_and_File_Structure.md`](../code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) through [`04_Demo_and_Release_Gate_Verification.md`](../code/Basic%20Code/implementations%20guide/04_Demo_and_Release_Gate_Verification.md).
- [ ] Verify `IngestionRecordSchema` quarantines malformed records into `ExceptionQueue` without blocking valid records.
- [ ] Verify `cascadeDelete()` writes a tombstone, deletes SQL/Vector/Graph/Cache artifacts, and returns `verifiedClean: true`.
- [ ] Verify `runBlueGreenReembedding()` upgrades dimensions (`1536 -> 3072`) with zero search downtime.

---

## Part C — Release Gate Commands (`code/Basic Code/`)

Run inside `Lecture 25 - AI Data Contracts and Lakehouse Lifecycle/code/Basic Code/`:

```bash
npm install
npm run typecheck
npm start
npm test
```

### Passing Criteria (Release Gate)

All of the following must exit with code `0`:

- [ ] `npm run typecheck` — zero TypeScript errors (`tsc --noEmit`).
- [ ] `npm start` — demonstrates Zod ingestion + quarantine, tenant-isolated search, Blue/Green swap, and GDPR cascade delete.
- [ ] `npm test` — all 5 automated release-gate tests in `src/release-gate.test.ts` pass:
  1. Zod contract quarantines invalid records without blocking valid ones.
  2. GDPR cascade delete leaves 0 derived artifacts and blocks zombie re-ingestion.
  3. Blue/Green re-embedding upgrades `1536d -> 3072d` with zero downtime.
  4. Mandatory `tenant_id` pre-filtering prevents cross-tenant leakage.
  5. Freshness SLA flags stale records at query time.

---

## Part D — Spoken / Written Defense

Be ready to answer in 2–3 sentences each:
1. Why is deleting a row from PostgreSQL insufficient for GDPR compliance in a RAG system?
2. Why can't vectors from two different embedding models share the same index?
3. How do content hashes and Lakehouse snapshots keep incremental re-embedding costs bounded?

