# 📝 Lecture 41 — Assignment & Release Gate

**Neuro-Symbolic Verification, Trajectory Evals, Z3 Constraints & GEPA**
Phase 10 · Quality, FinOps, Identity & Security · 🔴 Expert · **Estimated effort: 5–7 hours**

> **Read first:** the seven chapters in **[../notes](../notes)** (index: **[../index.md](../index.md)**).
> The lecture's **goal**, **build task**, and **release gate** live in **[../README.md](../README.md)** and **[../../roadmap-v1.md](../../roadmap-v1.md)** → *Lecture 41*.

---

## 🎯 What this assignment tests

| Weight | Part | What it tests | Output |
| :---: | :--- | :--- | :--- |
| **30%** | **A** — Chapter-wise practice | Can you design trajectory evals, calibrated judges, PBT, Z3 constraints, and GEPA | Written answers (`A1`–`A7`) |
| **35%** | **B** — Code & Implementation Guide | Can you build & walk through `code/Basic Code/` + `implementations guide/` | `../code/Basic Code` |
| **20%** | **C** — Release Gate Verification | Does Z3 block 100% of unsafe plans & GEPA improve pass rate | `npm test` (4/4 green) |
| **15%** | **D** — Spoken / Written Defense | Can you defend every verification layer in 2–3 sentences | 3 short answers |

---

## Part A — Chapter-wise practice

1. **A1 (Chapter 01):** Give a concrete example where two agent runs produce identical final text, yet one fails Trajectory Evaluation.
2. **A2 (Chapter 02):** Why should semantic judges use binary/3-level rubrics calibrated to $\ge 90\%$ human agreement instead of `1–10` scales?
3. **A3 (Chapter 03):** How does Property-Based Testing catch boundary bugs (`-10`, `50.01`, `101`) that example-based unit tests miss?
4. **A4 (Chapter 04):** Contrast probabilistic prompt guardrails vs. deterministic symbolic gates.
5. **A5 (Chapter 05):** Write Z3 constraints for: (a) `verifyPolicy` before `refundOrder`, (b) cumulative refund `<= 100`, and (c) `amount > 50 => hasHitlApproval`.
6. **A6 (Chapter 06):** Trace the 4-step GEPA reflective optimization loop and explain why a held-out split is required.
7. **A7 (Chapter 07):** Distinguish runtime Z3 gates (`< 10ms`) from build-time CI/CD trajectory & GEPA gates.

---

## Part B — `code/Basic Code/` & `implementations guide/`

Inspect, run, and extend [`../code/Basic Code/`](../code/Basic%20Code/) alongside its chapter-wise [`implementations guide/`](../code/Basic%20Code/implementations%20guide/):

- [ ] Read [`00_Overview_and_File_Structure.md`](../code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) through [`04_Demo_and_Release_Gate_Verification.md`](../code/Basic%20Code/implementations%20guide/04_Demo_and_Release_Gate_Verification.md).
- [ ] Verify `verifyPlanWithZ3()` returns `sat: false` with exact `violatedPolicies` for missing `verifyPolicy`, missing HITL (`> $50`), and over-budget (`> $100`) plans.
- [ ] Verify `runGepaOptimization()` improves pass rate from `0` to `1` by evolving targeted rules from failure traces.

---

## Part C — Release Gate Commands (`code/Basic Code/`)

Run inside `Lecture 41 - Neuro-Symbolic Verification Z3 and GEPA/code/Basic Code/`:

```bash
npm install
npm run typecheck
npm start
npm test
```

### Passing Criteria (Release Gate)

All of the following must exit with code `0`:

- [ ] `npm run typecheck` — zero TypeScript errors (`tsc --noEmit`).
- [ ] `npm start` — demonstrates Z3 `UNSAT` vs. `SAT` verification, trajectory scoring, and GEPA optimization.
- [ ] `npm test` — all 4 release-gate suites in `src/release-gate.test.ts` pass:
  1. Z3 verifier rejects 100% of policy-violating action plans pre-execution.
  2. Property-based invariant check passes across 50 randomized refund amounts (`-10..235`).
  3. Trajectory evaluator penalizes skipped preconditions (`overallScore < 0.7`).
  4. GEPA optimization improves benchmark pass rate (`0 -> 1`).

---

## Part D — Spoken / Written Defense

Be ready to answer in 2–3 sentences each:
1. Why is Z3 superior to prompt-only safety rules for enforcing financial and approval policies?
2. Why does GEPA optimize on a Pareto frontier (accuracy + token cost) instead of accuracy alone?
3. How do Property-Based Testing and Z3 complement each other?

