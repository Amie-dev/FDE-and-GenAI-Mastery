# 📝 Lecture 30 — Assignment & Release Gate

**Enterprise APIs, OpenAPI-to-MCP, Idempotency & Computer-Use Fallback**
Phase 7 · Connectors, Code Mode & Proactive Workflows · 🟠 Advanced · **Estimated effort: 5–7 hours**

> **Read first:** the seven chapters in **[../notes](../notes)** (index: **[../index.md](../index.md)**).
> The lecture's **goal**, **build task**, and **release gate** live in **[../README.md](../README.md)** and **[../../roadmap-v1.md](../../roadmap-v1.md)** → *Lecture 30*.

---

## 🎯 What this assignment tests

| Weight | Part | What it tests | Output |
| :---: | :--- | :--- | :--- |
| **30%** | **A** — Chapter-wise practice | Can you audit REST APIs, design OpenAPI-to-MCP compilers, idempotency, and browser fallbacks | Written answers (`A1`–`A7`) |
| **35%** | **B** — Code & Implementation Guide | Can you build & walk through `code/Basic Code/` + `implementations guide/` | `../code/Basic Code` |
| **20%** | **C** — Release Gate Verification | Does replaying a mutating tool call execute the side effect **exactly once** | `npm test` (5/5 green) |
| **15%** | **D** — Spoken / Written Defense | Can you defend every connector guardrail in 2–3 sentences | 3 short answers |

---

## Part A — Chapter-wise practice

1. **A1 (Chapter 01):** Name the 5 reasons raw REST endpoints make poor agent tools, and order the 3-tier integration ladder (`API -> Playwright -> Computer-Use`).
2. **A2 (Chapter 02):** Why should an OpenAPI-to-MCP compiler drop `DELETE` routes and auto-inject `idempotencyKey` on `POST`/`PATCH`?
3. **A3 (Chapter 03):** Trace what happens when a network timeout occurs *after* `POST /refunds` commits, and how `IdempotencyStore` prevents a double refund.
4. **A4 (Chapter 04):** How do scoped OAuth credentials and value-based HITL thresholds (`> $50`) protect legacy backends?
5. **A5 (Chapter 05):** Why is a typed Playwright MCP tool faster, cheaper, and safer than an unconstrained vision-based browser agent?
6. **A6 (Chapter 06):** When is Visual Computer-Use justified, and what three guardrails must surround it?
7. **A7 (Chapter 07):** Why must CI connector tests verify both **idempotency replay** AND **`409 Conflict` payload mismatch**?

---

## Part B — `code/Basic Code/` & `implementations guide/`

Inspect, run, and extend [`../code/Basic Code/`](../code/Basic%20Code/) alongside its chapter-wise [`implementations guide/`](../code/Basic%20Code/implementations%20guide/):

- [ ] Read [`00_Overview_and_File_Structure.md`](../code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) through [`04_Demo_and_Release_Gate_Verification.md`](../code/Basic%20Code/implementations%20guide/04_Demo_and_Release_Gate_Verification.md).
- [ ] Verify `compileOpenApiToMcp()` drops `delete_order` and injects `idempotencyKey` on `create_refund`.
- [ ] Verify `IdempotencyStore` replays identical calls (`replayed: true`), rejects mismatched payloads (`409 Conflict`), and pauses `> $50` refunds (`PENDING_APPROVAL`).
- [ ] Verify `submitLegacyErpCreditMemo()` blocks non-allow-listed domains (`403 Forbidden Origin`) and enforces idempotency on browser submits.

---

## Part C — Release Gate Commands (`code/Basic Code/`)

Run inside `Lecture 30 - Enterprise APIs OpenAPI-to-MCP and Computer-Use/code/Basic Code/`:

```bash
npm install
npm run typecheck
npm start
npm test
```

### Passing Criteria (Release Gate)

All of the following must exit with code `0`:

- [ ] `npm run typecheck` — zero TypeScript errors (`tsc --noEmit`).
- [ ] `npm start` — compiles OpenAPI spec, executes idempotent refund + replay (`upstreamCalls: 1`), and runs Playwright ERP fallback.
- [ ] `npm test` — all 5 automated release-gate tests in `src/release-gate.test.ts` pass:
  1. OpenAPI-to-MCP drops `DELETE` and requires `idempotencyKey` on mutations.
  2. Replaying a mutating call with the same `idempotencyKey` executes the side effect **exactly once**.
  3. Reusing an `idempotencyKey` with a different payload throws `409 Conflict`.
  4. Mutations above HITL threshold (`> $50`) return `PENDING_APPROVAL` without executing.
  5. Playwright fallback blocks non-allow-listed domains and enforces idempotency.

---

## Part D — Spoken / Written Defense

Be ready to answer in 2–3 sentences each:
1. Why is `sha256(payload)` required alongside `idempotencyKey` in an `IdempotencyStore`?
2. Why should you never expose raw `Computer-Use` screen-clicking when a Playwright DOM script can wrap the form?
3. How does an MCP Adapter enforce idempotency even when the legacy upstream REST API has no `Idempotency-Key` support?

