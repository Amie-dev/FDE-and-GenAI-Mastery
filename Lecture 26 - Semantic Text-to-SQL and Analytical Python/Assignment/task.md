# 📝 Lecture 26 — Assignment & Release Gate

**Semantic-Layer Text-to-SQL & Analytical Python**
Phase 6 · Enterprise Data, Semantics & SQL · 🔴 Expert · **Estimated effort: 5–7 hours**

> **Read first:** the eight chapters in **[../notes](../notes)** (index: **[../index.md](../index.md)**).
> The lecture's **goal**, **build task**, and **release gate** live in **[../README.md](../README.md)** and **[../../roadmap-v1.md](../../roadmap-v1.md)** → *Lecture 26*.

---

## 🎯 What this assignment tests

| Weight | Part | What it tests | Output |
| :---: | :--- | :--- | :--- |
| **30%** | **A** — Chapter-wise practice | Can you design Semantic Layers, SQL AST guards, Python sandboxes, and EX evals | Written answers (`A1`–`A8`) |
| **35%** | **B** — Code & Implementation Guide | Can you build & walk through `code/Basic Code/` + `implementations guide/` | `../code/Basic Code` |
| **20%** | **C** — Release Gate Verification | Does AST block 100% of DDL/DML/PII & pass 10-question EX benchmark | `npm test` (4/4 green) |
| **15%** | **D** — Spoken / Written Defense | Can you defend every guardrail in 2–3 sentences | 3 short answers |

---

## Part A — Chapter-wise practice

1. **A1 (Chapter 01):** Name the five failure modes of naive Text-to-SQL in production.
2. **A2 (Chapter 02):** Why must a Semantic Layer include enum sample values (`status IN ('active','past_due','canceled')`) alongside table schemas?
3. **A3 (Chapter 03):** Why should complex analytical SQL use `WITH` CTEs and `NULLIF(denom, 0)`?
4. **A4 (Chapter 04):** Show how a regex `DROP` filter can be bypassed, and explain why `node-sql-parser` AST validation prevents it.
5. **A5 (Chapter 05):** Why must `SELECT *` be blocked on tables containing restricted PII columns?
6. **A6 (Chapter 06):** List the three mandatory sandbox controls for running LLM-generated Python (`-I`, `env: {}`, import/builtin bans).
7. **A7 (Chapter 07):** In a cross-modal SQL + Vector + Graph workflow, why should modalities join on `canonicalId`s?
8. **A8 (Chapter 08):** Contrast SQL exact-string match vs. Execution Accuracy (EX), and explain how Numerical Reconciliation catches narrative hallucinations.

---

## Part B — `code/Basic Code/` & `implementations guide/`

Inspect, run, and extend [`../code/Basic Code/`](../code/Basic%20Code/) alongside its chapter-wise [`implementations guide/`](../code/Basic%20Code/implementations%20guide/):

- [ ] Read [`00_Overview_and_File_Structure.md`](../code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) through [`04_Demo_and_Release_Gate_Verification.md`](../code/Basic%20Code/implementations%20guide/04_Demo_and_Release_Gate_Verification.md).
- [ ] Verify `validateSqlAst()` blocks `DROP`, `UPDATE`, `DELETE`, stacked queries, `SELECT *` on PII tables, `billing_email` for `analyst`, and `LIMIT > 200`.
- [ ] Verify `runSandboxedPython()` executes `python3 -I` cleanly for math/stats and blocks `import os`.
- [ ] Verify `reconcileNumbers()` passes exact SQL/Python totals and rejects hallucinated numbers.

---

## Part C — Release Gate Commands (`code/Basic Code/`)

Run inside `Lecture 26 - Semantic Text-to-SQL and Analytical Python/code/Basic Code/`:

```bash
npm install
npm run typecheck
npm start
npm test
```

### Passing Criteria (Release Gate)

All of the following must exit with code `0`:

- [ ] `npm run typecheck` — zero TypeScript errors (`tsc --noEmit`).
- [ ] `npm start` — demonstrates AST blocking, sandboxed Python MRR growth calculation, and numerical reconciliation.
- [ ] `npm test` — all 4 release-gate suites in `src/release-gate.test.ts` pass:
  1. AST validator blocks 100% of `DROP`, `UPDATE`, `DELETE`, stacked queries, `SELECT *` on PII, unauthorized columns, and oversized `LIMIT`.
  2. Sandboxed Python computes exact warehouse metrics (`69000`, `72000`, `delta: 3000`) and blocks `import os`.
  3. Numerical reconciliation passes grounded prose and flags hallucinated numbers.
  4. 10-question execution-accuracy benchmark reconciles 100% against warehouse truth.

---

## Part D — Spoken / Written Defense

Be ready to answer in 2–3 sentences each:
1. Why is AST validation in TypeScript paired with a read-only database role (`defense in depth`)?
2. Why should SQL handle data reduction while Python handles statistical computation?
3. How does a Numerical Reconciliation Gate prevent board-deck hallucinations?

