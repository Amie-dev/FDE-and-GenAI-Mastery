# 📝 Lecture 24 — Assignment & Release Gate

**Enterprise Data Discovery, Ontologies & Apache Ossie**
Phase 6 · Enterprise Data, Semantics & SQL · 🟠 Advanced · **Estimated effort: 5–7 hours**

> **Read first:** the seven chapters in **[../notes](../notes)** (index: **[../index.md](../index.md)**).
> The lecture's **goal**, **build task**, and **release gate** live in **[../README.md](../README.md)** and **[../../roadmap-v1.md](../../roadmap-v1.md)** → *Lecture 24*.

---

## 🎯 What this assignment tests

| Weight | Part | What it tests | Output |
| :---: | :--- | :--- | :--- |
| **30%** | **A** — Chapter-wise practice | Can you map estates, trace lineage, resolve identities, and enforce SoR precedence | Written answers (`A1`–`A7`) |
| **35%** | **B** — Code & Implementation Guide | Can you build & walk through `code/Basic Code/` + `implementations guide/` | `../code/Basic Code` |
| **20%** | **C** — Release Gate Verification | Does your agent resolve conflicting CRM vs. Billing records 100% deterministically | `npm test` (5/5 green) |
| **15%** | **D** — Spoken / Written Defense | Can you defend every architectural choice in 2–3 sentences | 4 short answers |

---

## Part A — Chapter-wise practice

1. **A1 (Chapter 01):** Contrast an OLTP database vs. an analytical warehouse vs. a shadow spreadsheet for agent queries.
2. **A2 (Chapter 02):** Explain how upstream/downstream lineage propagates `RESTRICTED_PII` tags into downstream AI vector indexes.
3. **A3 (Chapter 03):** Why must synthetic email masking be **deterministic** (`createHmac`) rather than random UUIDs?
4. **A4 (Chapter 04):** Explain the 3-tier identity resolution hierarchy and why fuzzy company-name matches must never auto-merge.
5. **A5 (Chapter 05):** Write a semantic metric contract for `net_arr` (synonyms, `formulaSql`, `requiredFilters`, `authoritativeAsset`).
6. **A6 (Chapter 06):** Given `crm.accounts` (`status = "active"`) and `billing.subscriptions` (`status = "past_due"`), explain why precedence is **field-level** rather than system-level.
7. **A7 (Chapter 07):** How does progressive metadata injection prevent context bloat when a catalogue holds 10,000+ tables?

---

## Part B — `code/Basic Code/` & `implementations guide/`

Inspect, run, and extend [`../code/Basic Code/`](../code/Basic%20Code/) alongside its chapter-wise [`implementations guide/`](../code/Basic%20Code/implementations%20guide/):

- [ ] Read [`00_Overview_and_File_Structure.md`](../code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) through [`05_Ossie_Agent_and_Verification.md`](../code/Basic%20Code/implementations%20guide/05_Ossie_Agent_and_Verification.md).
- [ ] Verify `MetadataCatalogue` traces upstream lineage for `mart.customer_360` and masks `RESTRICTED` columns (`taxId`) for `CONFIDENTIAL` callers.
- [ ] Verify `resolveFieldWithPrecedence()` selects `billing` (`past_due`) for `subscriptionStatus` while selecting `crm` (`Alice Rivera`) for `accountOwner`.

---

## Part C — Release Gate Commands (`code/Basic Code/`)

Run inside `Lecture 24 - Enterprise Data Discovery and Apache Ossie/code/Basic Code/`:

```bash
npm install
npm run typecheck
npm start
npm test
```

### Passing Criteria (Release Gate)

All of the following must exit with code `0`:

- [ ] `npm run typecheck` — zero TypeScript errors (`tsc --noEmit`).
- [ ] `npm start` — prints upstream lineage and resolves `acme.com` conflicts with full provenance citations.
- [ ] `npm test` — all 5 automated release-gate tests in `src/release-gate.test.ts` pass:
  1. Conflicting CRM vs. Billing status resolves via `billing > crm` precedence 100% of the time (and `crm` wins `accountOwner`).
  2. Lineage DAG traces upstream sources for `mart.customer_360`.
  3. Business vocabulary resolves `"ARR"` to canonical `net_arr`.
  4. Column-level ACL masks `RESTRICTED` columns for `CONFIDENTIAL` callers.
  5. Synthetic email masking is deterministic across CRM and Billing.

---

## Part D — Spoken / Written Defense

Be ready to answer in 2–3 sentences each:
1. Why do metadata-blind Text-to-SQL agents fail in real enterprises even with frontier LLMs?
2. Why must a metadata-aware agent report `conflictsOverridden` instead of silently returning the winning value?
3. How do canonical entities decouple AI workflows from vendor SaaS migrations?

