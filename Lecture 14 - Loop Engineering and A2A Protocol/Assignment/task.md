# 📝 Lecture 14 — Assignment & Release Gate

**Advanced Loop Engineering, Adaptive Topologies & A2A Protocol**
Phase 3 · Agency, Graphs & Loop Engineering · 🟠 Advanced · **Estimated effort: 5–7 hours**

> **Read first:** the seven chapters in **[../notes](../notes)** (index: **[../index.md](../index.md)**).
> The lecture's **goal**, **build task**, and **release gate** live in **[../README.md](../README.md)** and **[../../roadmap-v1.md](../../roadmap-v1.md)** → *Lecture 14*.

---

## 🎯 What this assignment tests

| Weight | Part | What it tests | Output |
| :---: | :--- | :--- | :--- |
| **30%** | **A** — Chapter-wise practice | Can you explain PAV, 4D budgets, stuck detection, adaptive graphs, and A2A | Written answers (`A1`–`A7`) |
| **35%** | **B** — Code & Implementation Guide | Can you build & walk through `code/Basic Code/` + `implementations guide/` | `../code/Basic Code` |
| **20%** | **C** — Release Gate Verification | Does your engine catch an infinite tool-failure loop $\le 3$ iterations | `npm test` (5/5 green) |
| **15%** | **D** — Spoken / Written Defense | Can you defend every design choice in 2–3 sentences | 5 short answers |

---

## Part A — Chapter-wise practice

1. **A1 (Chapter 01):** Name the three failure modes of raw ReAct in 15+ step workflows and explain how Plan-Act-Verify prevents each.
2. **A2 (Chapter 02):** Why must `BudgetGuard.canStartStep()` check `tokensUsed + estimatedNextTokens > maxTokens` *before* dispatching the next model call?
3. **A3 (Chapter 03):** Design a `$0` deterministic pre-flight filter for a 5-minute heartbeat monitoring a GitHub repository.
4. **A4 (Chapter 04):** Given a `400 Bad Request` structural failure vs. a `429 Rate Limit` transient failure, explain why one triggers **Pivot** and the other triggers **Retry**.
5. **A5 (Chapter 05):** When does a static `StateGraph` break, and what two bounds (`maxFanOut`, `maxDepth`) must every adaptive topology enforce?
6. **A6 (Chapter 06):** Contrast **MCP** vs. **A2A** and list the four core fields of an **Agent Card** (`/.well-known/agent.json`).
7. **A7 (Chapter 07):** Why must parallel A2A fan-out use `Promise.allSettled` + per-branch timeouts + veto precedence instead of `Promise.all`?

---

## Part B — `code/Basic Code/` & `implementations guide/`

Inspect, run, and extend [`../code/Basic Code/`](../code/Basic%20Code/) alongside its chapter-wise [`implementations guide/`](../code/Basic%20Code/implementations%20guide/):

- [ ] Read [`00_Overview_and_File_Structure.md`](../code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) through [`05_Plan_Act_Verify_Orchestrator_and_Verification.md`](../code/Basic%20Code/implementations%20guide/05_Plan_Act_Verify_Orchestrator_and_Verification.md).
- [ ] Verify `BudgetGuard` blocks `FORBIDDEN` and `APPROVAL_REQUIRED` tools at the harness boundary.
- [ ] Verify `StuckDetector` detects exact-repeat failures within $\le 3$ iterations, bans the failing signature, and pivots to an alternative plan.
- [ ] Verify `A2AClientRegistry` discovers peers by skill tag, handles partial timeouts via `Promise.allSettled`, and rolls peer token/cost usage into the parent budget.

---

## Part C — Release Gate Commands (`code/Basic Code/`)

Run inside `Lecture 14 - Loop Engineering and A2A Protocol/code/Basic Code/`:

```bash
npm install
npm run typecheck
npm start
npm test
```

### Passing Criteria (Release Gate)

All of the following must exit with code `0`:

- [ ] `npm run typecheck` — zero TypeScript errors (`tsc --noEmit`).
- [ ] `npm start` — demonstrates `$0` proactive trigger filtering, `Plan-Act-Verify` stuck detection + pivot recovery, and parallel A2A delegation.
- [ ] `npm test` — all 5 automated release-gate tests in `src/release-gate.test.ts` pass:
  1. Injected infinite tool-failure loop is detected $\le 3$ iterations and pivots to recovery.
  2. Unrecoverable infinite failure escalates (`STUCK_MAX_PIVOTS`) after `maxPivots` without exceeding token budget.
  3. Hard token budget cap halts the loop (`BUDGET_EXCEEDED`) before overspending.
  4. Proactive trigger gate enforces `$0` pre-flight, idempotency deduplication, and cooldowns.
  5. A2A parallel delegation handles partial timeout and enforces `REJECT` veto precedence.

---

## Part D — Spoken / Written Defense

Be ready to answer in 2–3 sentences each:
1. Why is `Plan-Act-Verify` safer than raw ReAct for multi-step production workflows?
2. How does `StuckDetector` distinguish an `A-B-A-B` oscillation from normal progress?
3. Why should an A2A coordinator never share internal memory directly with a specialist peer?

