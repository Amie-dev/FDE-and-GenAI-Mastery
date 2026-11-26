# 📝 Lecture 08 — Assignment & Release Gate

**Model Routing & Agent Harness Velocity (`AGENTS.md`, `Pi`, SDD/TDD)**
Phase 2 · Application Layer & Harness Velocity · 🟡 Intermediate · **Estimated effort: 4–6 hours**

> **Read first:** the seven chapters in **[../notes](../notes)** (index: **[../index.md](../index.md)**).
> The lecture's **goal**, **build task**, and **release gate** live in **[../README.md](../README.md)** and **[../../roadmap-v1.md](../../roadmap-v1.md)** → *Lecture 08*.

---

## 🎯 Goal

Build and verify a TypeScript **Model Router + Harness Velocity** system in [`../code`](../code) that proves both halves of Lecture 08:

1. **Dynamic Model Router + Prefix Cache Tracker** — routes simple requests to a **System-1 (fast)** model and multi-constraint/debugging requests to a **System-2 (deliberative)** model with bounded thinking budgets, tracks prompt-prefix cache hits, and proves **$\ge 40\%$ cost reduction** on a 20-query mixed benchmark with **zero accuracy regression**.
2. **`AGENTS.md` + SDD/TDD Harness Runner** — loads repository invariants from `AGENTS.md`, runs an automated **Red $\rightarrow$ Green $\rightarrow$ Review** loop in an isolated sandbox, rejects broken patches & test-tampering attempts, and iterates until all spec tests pass.

---

## 📋 Tasks

### Task 1 — Dynamic Complexity Router & Cache Economics (`notes/01`–`03`)
Inspect and run `code/src/router.ts` and `code/src/cache.ts`:
- [ ] Verify that `scoreComplexity()` routes low-complexity queries (e.g., classification, formatting, extraction) to `system1` (`thinkingBudget: 0`) and high-complexity queries (e.g., race conditions, multi-file refactors, failed prior attempts) to `system2` with a bounded thinking budget.
- [ ] Verify that `PrefixCacheTracker` detects static-prefix hits (`>= 1024` tokens) and invalidates the cache when a volatile token is injected at the start of the prompt.
- [ ] Run the 20-query mixed benchmark (`npm run benchmark`) and confirm **cost savings $\ge 40\%$** vs. an all-System-2 baseline with **100% accuracy parity**.

### Task 2 — `AGENTS.md` + SDD/TDD Harness Loop (`notes/04`–`07`)
Inspect and run `code/src/harness.ts` and `code/AGENTS.md`:
- [ ] Confirm `code/AGENTS.md` is concise (`< 150` lines) and defines commands, invariants, and protected test boundaries.
- [ ] Confirm the harness enforces **Verify RED First** (rejects specs whose tests pass before implementation).
- [ ] Confirm the **Reward-Hacking Guard** blocks any patch that modifies protected test files.
- [ ] Confirm the **SDD/TDD + Escalation Loop** rejects an injected broken System-1 patch on Attempt 1, escalates to System-2, passes deterministic tests + independent review, and reaches `APPROVED`.

---

## 🧪 Release Gate Commands

Run inside `Lecture 08 - Model Routing and Harness Velocity/code/`:

```bash
npm install
npm run typecheck
npm run benchmark
npm test
```

### Passing Criteria (Release Gate)

All of the following must exit with code `0`:

- [ ] `npm run typecheck` — zero TypeScript errors (`tsc --noEmit`).
- [ ] `npm run benchmark` — 20-query mixed benchmark prints **Cost Savings $\ge 40.0\%$** and **Accuracy Regression: 0**.
- [ ] `npm test` — all automated release-gate tests in `src/release-gate.test.ts` pass:
  1. Complexity router classifies simple vs. complex queries and enforces `priorAttemptFailed` escalation.
  2. Prefix cache achieves `> 70%` savings on multi-turn static prefixes and detects one-byte invalidation.
  3. 20-query benchmark achieves `>= 40%` cost reduction with `0` accuracy drop vs. all-System-2.
  4. SDD/TDD harness automatically rejects a broken patch, blocks test-file tampering, escalates to System-2, and passes on iteration 2.
  5. Independent reviewer rejects patches with `any` / spec violations and approves clean patches.

---

## 🗣️ Spoken / Written Defense (Self-Check)

Be ready to answer in 2–3 sentences each:
1. Why are thinking tokens billed at `output_tokens` rates, and why must `max_tokens` exceed `budget_tokens`?
2. How does a single `Date.now()` in a system prompt destroy prefix-cache economics?
3. Why does the `Pi` harness use 4 core tools + `AGENTS.md` + on-demand skills instead of 30 built-in tools?
4. How does SDD/TDD + an independent fresh-context reviewer prevent both hallucinations and reward hacking?

