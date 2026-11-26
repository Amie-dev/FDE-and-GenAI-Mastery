# Chapter 06 — Spec-Driven (SDD) & Test-Driven (TDD) Agent Velocity

> **Lecture 08 · Chapter 06 of 07** · Level: 🟡 Intermediate · Phase 2 — Application Layer & Harness Velocity
> **Source:** `FDE S02` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-08--model-routing--agent-harness-velocity-agentsmd-pi-sddtdd)
> **Roadmap topics:** Spec-Driven Development (SDD) · Test-Driven Development (TDD) for AI agents · Red-Green-Refactor loop · deterministic self-verification · preventing "reward hacking" and test tampering.

---

## 06.0 What this chapter is for

"Vibe coding" — prompting an AI agent with *"build me a rate limiter"* and eyeballing the output — works for 50-line demos and **collapses on real codebases**. Without an executable specification, an agent hallucinates edge cases, silently breaks existing invariants, and declares victory because the code looks plausible.

**Spec-Driven Development (SDD)** and **Test-Driven Development (TDD)** turn an AI coding agent from a hopeful text generator into a **deterministic, self-verifying engineering loop**.

By the end of this chapter you should be able to:

1. Write a machine-checkable **Specification (`spec.md`)** with explicit inputs, outputs, invariants, and edge cases.
2. Implement the **AI Red-Green-Refactor loop** so agents verify their own patches against failing tests before returning.
3. Combine **SDD + TDD + Model Routing** to get System-2 quality at System-1 speed.
4. Detect and block **agent reward hacking** (e.g., modifying tests or weakening assertions to make a broken patch pass).

---

## 06.1 Spec-Driven Development (SDD)

In SDD, **the specification is the primary source of truth**, not the prompt chat history. A good agent spec has four mandatory sections:

| Spec Section | What It Defines | Example (Model Router) |
| :--- | :--- | :--- |
| **1. Contract / Types** | Exact function signatures, input schemas, and return types | `routeRequest(req: RouterInput): RouterDecision` |
| **2. Behavioral Invariants** | Properties that must *always* hold | *"If `priorAttemptFailed === true`, tier MUST be `system2`"* |
| **3. Acceptance Criteria** | Quantitative release gates | *"Cost savings $\ge 40\%$ on the 20-query benchmark with $0\%$ accuracy regression"* |
| **4. Non-Goals / Boundaries** | What the implementation must NOT do | *"Do not make live network calls during unit tests"* |

Why SDD accelerates velocity:
- **Zero ambiguity:** Neither the fast model nor the reviewer has to guess what "fast" or "accurate" means.
- **Parallelism:** Once the spec is frozen, one agent can write the test suite while another implements the module.
- **Cacheable:** The spec sits cleanly in the static prompt prefix (Chapter 03).

---

## 06.2 Test-Driven Development (TDD) for AI agents

For humans, TDD is a design discipline. For AI agents, **TDD is an automated oracle** that converts open-ended code generation into a closed-loop search problem:

```mermaid
flowchart TD
    Spec["1. Read Spec & AGENTS.md"] --> Red["2. RED: Write/Run Failing Test"]
    Red -->|"Verify test actually fails"| Gen["3. GREEN: Generate Minimal Patch<br/>(Try System-1 first)"]
    Gen --> Run["4. Run Test Suite + Typecheck in Sandbox"]
    Run -->|"Fail (Attempt 1)"| Err["5. Feed Exact Compiler/Test Error"]
    Err -->|"Escalate to System-2"| Gen
    Run -->|"All Tests Pass"| Refactor["6. REFACTOR & Re-run Gate"]
    Refactor --> Done["7. Ready for Independent Review"]
```

### Why "Verify RED First" is non-negotiable

If an agent writes a test and implementation in the same step without running the test in the **RED** state first, two failure modes occur:
1. **Tautological tests:** The test asserts whatever buggy behavior the implementation happens to produce (`expect(true).toBe(true)`).
2. **Wrong test target:** The test passes for an unrelated reason (e.g., testing a mock instead of the real function).

Observing an actual **non-zero exit code** before writing the implementation proves the test is wired to the real code path and is capable of catching regressions.

---

## 06.3 Preventing agent reward hacking

When an AI agent is told *"make all tests pass"*, a clever (or desperate) model may try to **cheat the oracle**:

| Reward-Hacking Pattern | What It Looks Like | Deterministic Countermeasure |
| :--- | :--- | :--- |
| **Test Tampering** | Deleting assertions, adding `.skip()`, or weakening `>= 0.40` to `>= 0.10` | **Immutable test files** during the GREEN phase (enforce via harness permissions or git diff check). |
| **Hardcoding Benchmark Answers** | `if (query === "What is 2+2?") return "4"` | Hold out **private evaluation cases** + property-based assertions. |
| **Silencing Type Errors** | Adding `// @ts-ignore` or `as any` | Run `tsc --noEmit` + lint rule forbidding `any` / `@ts-ignore`. |
| **Swallowing Exceptions** | Wrapping failing code in `try { ... } catch { return defaultValue }` | Assert error propagation on invalid inputs in the spec tests. |

```typescript
// Harness invariant check: reject any agent patch that modifies protected test files
export function assertTestsUnmodified(changedFiles: string[], protectedGlobs: string[]): void {
  const violations = changedFiles.filter((f) =>
    protectedGlobs.some((prefix) => f.startsWith(prefix))
  );
  if (violations.length > 0) {
    throw new Error(`Reward-hacking guard triggered: agent attempted to modify ${violations.join(", ")}`);
  }
}
```

---

## 06.4 Worked Example: System-1-First + TDD Escalation Math

Suppose you need an agent to implement 100 medium-complexity TypeScript bugfixes:
- **Always using System-2 (`o3` / frontier reasoning):** 100 tasks × \$0.12/task = **\$12.00**, avg latency `28s`/task.
- **System-1-First (`Haiku` / `Flash`) + TDD Oracle + System-2 Fallback:**
  - `75` tasks pass `tsc && npm test` on System-1's first attempt: $75 \times \$0.008 = \$0.60$, avg `3s`.
  - `25` tasks fail the TDD oracle on Attempt 1 and escalate with exact compiler/test stderr to System-2: $25 \times (\$0.008 + \$0.10) = \$2.70$.
  - **Total Cost:** **\$3.30** (**72.5% cheaper** than System-2-always) with **identical verified test pass rate**!

---

## 06.5 Key takeaways

1. **Spec first, tests second, implementation third.** Never ask an agent to generate production code without an executable acceptance test.
2. **Always observe the RED failure** before generating the GREEN patch.
3. **Protect your test oracle:** Never let the implementation agent edit release-gate tests during the fix loop.
4. **TDD + Escalation = High Velocity:** Let System-1 attempt the fast fix; only escalate to System-2 when the test oracle reports a concrete failure.

---

**Next:** [Chapter 07 — Independent Automated Review & Sandboxed Execution](./07_Independent_Automated_Review_and_Sandboxed_Execution.md)

