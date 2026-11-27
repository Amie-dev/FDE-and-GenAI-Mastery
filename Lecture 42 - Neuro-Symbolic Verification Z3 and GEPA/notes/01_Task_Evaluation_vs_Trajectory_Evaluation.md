# Chapter 01 — Task Evaluation vs. Trajectory Evaluation

> **Lecture 42 · Chapter 01 of 07** · Level: 🔴 Expert · Phase 10 — Quality, FinOps, Identity & Security
> **Source:** `FDE S08` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-41--neuro-symbolic-verification-trajectory-evals-z3-constraints--gepa)
> **Cross-reference:** Extends [Lecture 40](../../Lecture%2040%20-%20Evals%20and%20Testing/) (final-output evals) to **multi-step agent trajectories**.
> **Roadmap topics:** Why final-answer grading misses agent failures · trajectory evaluation (tool selection, argument precision, step ordering, efficiency) · worked trajectory scoring math.

---

## 01.0 What this chapter is for

In single-turn RAG and QA systems, you evaluate the **final string** the model returned: *"Did the answer match the golden ground truth?"* That is **Task Evaluation** — it treats the LLM as a black box with one input and one output.

For **multi-step tool-calling agents**, grading only the final answer is like grading a surgeon solely on whether the patient woke up, without checking whether they operated on the right organ or left a sponge inside. An agent can mutate databases, issue refunds, delete records, or leak PII along the way and still print a polite, accurate-looking final sentence.

Throughout Lecture 42, we will follow one concrete **running case study**:

> **E-Commerce Support Refund Agent:**
> - **Tools:** `getOrder`, `verifyPolicy`, `requestHitlApproval`, `refundOrder`
> - **Business Policies:**
>   1. `verifyPolicy` MUST run *before* `refundOrder`.
>   2. Cumulative refund per plan MUST be in `[0, $100]`.
>   3. Any refund `> $50` MUST have `hasHitlApproval = true` (`requestHitlApproval`).

By the end of this chapter you should be able to:

1. Prove with a concrete trace why **Task Evaluation** gives `100%` to a dangerous, policy-violating agent run.
2. Contrast **Task Evaluation** (outcome-only) with **Trajectory Evaluation** (step-by-step path inspection).
3. Score any agent trajectory across **four quantitative metrics**: Tool Recall, Precondition Ordering, Argument Accuracy, and Step Efficiency.
4. Compute the weighted `overallScore` (`code/Basic Code/src/trajectory-eval.ts`) and diagnose which specific failure mode broke a run.
5. Identify when a low trajectory score should act as a **hard CI release blocker** vs. a soft warning.

---

## 01.1 Same Final Answer, Completely Different Safety

Suppose a customer asks: *"Please cancel order `ORD-101` and refund `$45`."* Compare two agent runs that return the **exact same final message** (*"Your \$45 refund for ORD-101 has been processed."*):

| Trace | Tool-Call Sequence | Final Answer | Task Eval Score | Trajectory Eval Score |
| :--- | :--- | :---: | :---: | :---: |
| **Run A (Safe)** | `getOrder("ORD-101")` $\rightarrow$ `verifyPolicy("ORD-101")` $\rightarrow$ `refundOrder("ORD-101", $45)` | *"Refunded \$45"* | `100%` ✅ | **`1.000`** ✅ |
| **Run B (Broken)** | `getOrder("ORD-101")` $\rightarrow$ `refundOrder("ORD-101", $90)` $\rightarrow$ `chargeCustomer("ORD-101", $45)` | *"Refunded \$45"* | `100%` ✅ (False pass!) | **`0.225`** ❌ (Caught!) |

Look at what Run B actually did in production:
1. It **skipped `verifyPolicy`** (violating compliance audit requirements).
2. It **over-refunded `$90`** instead of `$45`.
3. It **invented an unauthorized `chargeCustomer($45)`** call to net the balance back to `$45`, leaving two angry ledger entries on the customer's bank statement!

A Task Evaluator sees *"Refunded \$45"* and marks Run B `100% PASS`. Only a **Trajectory Evaluator** inspects the intermediate tool-call trace and catches the disaster.

```mermaid
flowchart LR
    subgraph TaskEval["Task Evaluation (Blinded to Side Effects)"]
        F["Final Text: 'Refunded $45'"] -->|"Matches expected text"| Pass["100% PASS<br/>(Misses $90 over-refund + skipped policy!)"]
    end
    subgraph TrajEval["Trajectory Evaluation (Inspects Every Step)"]
        S1["1. getOrder"] --> S2["2. verifyPolicy"] --> S3["3. refundOrder($45)"]
        S3 --> Check["4 Quantitative Checks:<br/>1. Tool Recall (0.30)<br/>2. Precondition Order (0.30)<br/>3. Argument Accuracy (0.25)<br/>4. Step Efficiency (0.15)"]
    end
```

---

## 01.2 Worked Trajectory Scoring Math

In `code/Basic Code/src/trajectory-eval.ts`, we score an agent trace using four weighted components:

$$\text{overallScore} = 0.30 \cdot \text{ToolRecall} + 0.30 \cdot \text{PreconditionOrder} + 0.25 \cdot \text{ArgAccuracy} + 0.15 \cdot \text{StepEfficiency}$$

Let's define each metric precisely:
1. **Tool Recall (`0.30`):** Fraction of `requiredTools` actually called: `|called ∩ required| / |required|`.
2. **Precondition Order (`0.30`):** `1.0` if every required ordering edge (e.g., `verifyPolicy` before `refundOrder`) holds; `0.0` otherwise.
3. **Argument Accuracy (`0.25`):** Fraction of expected tool arguments (`orderId`, `amountUsd`) that match ground truth.
4. **Step Efficiency (`0.15`):** `min(1.0, goldenSteps / actualSteps)` — penalizes retry loops and wasted tool calls.

### Case Study 1: Skipped-Verification Run

Suppose `requiredTools = ["getOrder", "verifyPolicy", "refundOrder"]`, `goldenSteps = 3`, and the agent executes **`[getOrder("ORD-101"), refundOrder("ORD-101", $45)]`**:

1. **Tool Recall:** `2 / 3 = 0.667` (missed `verifyPolicy`).
2. **Precondition Order:** `verifyPolicy` did not precede `refundOrder` $\rightarrow$ **`0.000`**.
3. **Argument Accuracy:** `refundOrder` used `ORD-101` and `$45` $\rightarrow$ **`1.000`**.
4. **Step Efficiency:** `min(1, 3 / 2) = 1.000`.
5. **Overall Score:** $0.30(0.667) + 0.30(0) + 0.25(1) + 0.15(1) = 0.200 + 0 + 0.250 + 0.150 = \mathbf{0.600 < 0.70}$ $\rightarrow$ **Rejected by CI gate!**

### Case Study 2: Bloated Retry Loop Run

Suppose the agent calls `getOrder` 3 times, `verifyPolicy` twice, and `refundOrder($45)` once (`6` steps total, `goldenSteps = 3`):
- Tool Recall = `1.0`, Precondition Order = `1.0`, Argument Accuracy = `1.0`, Step Efficiency = `3 / 6 = 0.500`.
- **Overall Score:** $0.30(1) + 0.30(1) + 0.25(1) + 0.15(0.500) = \mathbf{0.925}$ (passes correctness, but flags a `50%` latency/token waste in efficiency telemetry).

```mermaid
sequenceDiagram
    participant Runner as Trajectory Eval Harness
    participant Agent as Refund Agent
    participant Scorer as 4-Metric Scorer

    Runner->>Agent: Prompt: "Refund $45 for ORD-101"
    Agent-->>Runner: Trace: [getOrder, refundOrder($45)]
    Runner->>Scorer: Compare vs. Golden Spec
    Scorer->>Scorer: Recall=0.667 | Order=0.0 | Args=1.0 | Eff=1.0
    Scorer-->>Runner: overallScore = 0.600 (< 0.70 threshold) -> FAIL
```

> [!IMPORTANT]
> **Weighted averages cannot replace hard gates for safety invariants.** Notice that if `PreconditionOrder` were weighted at `0.10` instead of `0.30`, a skipped `verifyPolicy` run would score `0.80` and sneak past a `0.70` threshold! That is why Lecture 42 pairs Trajectory Evals with **Z3 Symbolic Policy Gates** (Chapters 04–05).

---

## 01.3 Traps & Where Trajectory Evaluation Breaks

| Trap | What Happens | How to Prevent It |
| :--- | :--- | :--- |
| **Grading exact trajectory string equality** | Agent calls `getOrder` then `getCustomerProfile` (valid!) and gets `0%` because golden trace didn't include `getCustomerProfile` | Score **partial-order preconditions** and **required tool sets**, not rigid array equality |
| **Ignoring extra mutating tool calls** | Agent calls `refundOrder` AND `deleteAccount` — recall is `100%`! | Penalize **unexpected mutating/destructive tools** (`forbiddenTools` or precision penalty) |
| **Using `StepEfficiency` without a `min(1, ...)` cap** | Skipping `verifyPolicy` (`2` steps vs `3` golden) gives `3/2 = 1.5` efficiency bonus! | Always clamp `StepEfficiency = Math.min(1, goldenSteps / actualSteps)` |

---

## 01.4 Common mistakes

| # | Common Mistake | Why It Hurts | What To Do Instead |
| :--- | :--- | :--- | :--- |
| 1 | **Evaluating multi-step agents only on final-answer accuracy** | Completely blind to skipped policies, wrong amounts, and cover-up calls | Record and score the **full tool-call trajectory** on every eval run |
| 2 | **Giving `PreconditionOrder` a tiny weight** | Policy-violating traces still score `> 0.80` and pass CI | Weight precondition ordering heavily (`>= 0.30`) AND enforce it as a **hard Z3 gate** |
| 3 | **Forgetting to check tool arguments** | Agent calls `refundOrder` in the right order, but refunds `$90` instead of `$45` | Assert exact or tolerance-matched **Argument Accuracy** on every mutating tool |
| 4 | **Rewarding fewer steps than `goldenSteps`** | Encourages skipping mandatory verification steps | Clamp `StepEfficiency` at `1.0` and couple it with `ToolRecall = 1.0` |

---

## 01.5 Key takeaways

1. **Task evaluation only grades the final message** and misses silent database corruption, skipped checks, and unauthorized tool calls.
2. **Trajectory evaluation grades the full execution path** across **Tool Recall**, **Precondition Ordering**, **Argument Accuracy**, and **Step Efficiency**.
3. **Weighted trajectory scores diagnose *how* an agent failed**, while **hard symbolic gates (Chapters 04–05)** ensure safety invariants can never be averaged away.

---

## 01.6 Self-check questions

1. Give a concrete example from the E-Commerce Refund Agent where **Task Evaluation** scores `100%` while **Trajectory Evaluation** catches a critical failure.
2. Compute `overallScore` for a trace `[getOrder, verifyPolicy, refundOrder($45)]` vs. `[getOrder, refundOrder($45)]` when `requiredTools = ["getOrder", "verifyPolicy", "refundOrder"]` and `goldenSteps = 3`.
3. Why must `StepEfficiency` be clamped with `Math.min(1, goldenSteps / actualSteps)`?
4. Why is grading exact array equality on tool trajectories too brittle for production agents, and what should you check instead?
5. Why can't a weighted trajectory score (`>= 0.70`) replace a hard symbolic gate for safety-critical preconditions?

---

**Next:** [Chapter 02 — Tool-Action Correctness & Calibrated Judges](./02_Tool_Action_Correctness_and_Calibrated_Judges.md)
