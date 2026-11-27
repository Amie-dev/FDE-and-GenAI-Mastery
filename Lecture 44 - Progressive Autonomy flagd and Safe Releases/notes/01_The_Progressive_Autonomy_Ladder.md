# Chapter 01 — The Progressive Autonomy Ladder

> **Lecture 44 · Chapter 01 of 07** · Level: 🟠 Advanced · Phase 10 — Quality, FinOps, Identity & Security
> **Source:** `FDE S18` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-43--progressive-autonomy-feature-flags-openfeatureflagd--safe-releases)
> **Roadmap topics:** Why agents are probabilistic interns · the 4-rung Progressive Autonomy Ladder (Shadow → Human-Approved → Scoped Autonomous → Expanded Production) · objective graduation criteria · machine-enforceable scope boundaries.

---

## 01.0 What this chapter is for

Think about how you onboard a new junior support engineer:
- **Week 1 (Shadowing):** They watch tickets come in and write down what they *would* have replied—without sending anything to customers.
- **Week 2 (Drafting for Approval):** They draft replies and refund requests, and a senior rep clicks **Approve** or **Edit** before anything executes.
- **Week 3 (Scoped Independence):** They auto-approve simple refunds under `\$25` on standard orders; anything bigger or unusual still goes to a senior rep.
- **Month 2 (Full Trust):** After weeks of clean audits, their scope expands.

**AI agents are probabilistic interns.** Yet teams routinely deploy an agent straight from staging to *"autonomous production execution"*—and then act surprised when a `2%` edge-case hallucination turns into 200 unauthorized refunds or corrupted CRM records in an afternoon.

**Progressive Autonomy** turns trust into an engineering state machine: **every rung is earned with measured production evidence, never guesswork.**

By the end of this chapter you should be able to:

1. Explain why shipping directly to full autonomy causes catastrophic blast radius on edge cases.
2. Describe all **four rungs of the Progressive Autonomy Ladder** and their blast radius.
3. Define **objective graduation metrics** (action agreement rate, unedited approval rate, SLO compliance) for promoting an agent.
4. Implement **four machine-enforceable scope boundaries** in deterministic code rather than natural-language prompts.

---

## 01.1 The Four-Rung Progressive Autonomy Ladder

```mermaid
flowchart LR
    R1["Rung 1: Shadow Mode<br/>0% User Impact<br/>Agent runs silently; humans do 100% of work"] -->|"Action Agreement >= 92%<br/>0 Policy Violations"| R2["Rung 2: Human-Approved (Copilot)<br/>Agent drafts action/tool call;<br/>Human clicks Approve or Edit"]
    R2 -->|"Unedited Approval >= 95%<br/>Review Latency < 15s"| R3["Rung 3: Scoped Autonomous<br/>Auto-executes ONLY low-risk slices<br/>(e.g. refunds <= \$25, standard tier)"]
    R3 -->|"30-Day SLO Green<br/>Signed Release Manifest"| R4["Rung 4: Expanded Autonomy<br/>Higher limits / broader cohorts<br/>Always behind flagd kill-switch"]
```

### Detailed Comparison of Each Rung

| Rung | Who Executes Write Actions? | User Sees Agent Output? | Blast Radius | Primary Metric to Graduate |
| :--- | :--- | :---: | :---: | :--- |
| **1. Shadow Mode** | Human only (agent runs silently in background) | No | **Zero** | **Action Agreement Rate** (agent draft vs. actual human decision) |
| **2. Human-Approved** | Human clicks `Approve`, `Edit`, or `Reject` | Draft only | **Low** (human catches bad calls) | **Unedited Approval Rate** & **Edit Distance** |
| **3. Scoped Autonomous** | Agent auto-executes **within strict bounds** | Yes (scoped slice only) | **Bounded** (capped `\$` / reversible tools) | **Task Success Rate**, **CPST**, & **0 Policy Breaches** |
| **4. Expanded Production** | Agent auto-executes across cohorts | Yes | **Controlled** (SLO + `<30s` rollback) | **Error Budget Remaining** & **Audit Pass Rate** |

> [!IMPORTANT]
> **Never skip Rung 1 (Shadow Mode).** Even if your offline CI eval suite passed `98%`, live production inputs contain messy HTML, unexpected languages, and edge-case business states that only real traffic exposes.

---

## 01.2 Worked Example: Shipping an E-Commerce Refund Agent

Suppose your company processes **10,000 refund tickets per week** (average refund: `\$42`):

1. **Week 1 — Rung 1 (Shadow Mode):**
   - When a human rep opens Ticket `#8812` (`"Damaged mug, \$18.50"`), the AI agent runs silently in parallel and logs: `{ tool: "issue_refund", amount: 18.50 }`.
   - **What you catch safely:** On `140` tickets where the customer had *already* received a replacement, the agent still proposed a refund! Because it was in Shadow Mode, **\$0 was lost**. You fix the system prompt and add a deterministic replacement-order check.
2. **Week 2 — Rung 2 (Human-Approved Copilot):**
   - Support reps now see a pre-filled **"AI Suggested Refund: \$18.50 [Approve] [Edit]"** card in their UI.
   - **Graduation Check:** Over `2,000` tickets, reps click **Approve without editing** on **96.4%** of tickets.
3. **Week 3 — Rung 3 (Scoped Autonomous):**
   - Via `flagd`, you allow automatic execution **only** when **every** guardrail passes:
     - `amount_usd <= 25`
     - `customer_tier != "vip_escalated"`
     - `customer_refunds_last_30d < 3`
     - `tenant_id` is in the `canary_10pct` cohort
   - Any ticket outside those bounds automatically falls back to **Rung 2 (Human-Approved)**.
4. **Week 4+ — Rung 4 (Expanded Autonomy):**
   - After 14 days of green SLOs and zero policy breaches, you raise `max_auto_refund_usd` from `25` → `75` in `flagd` without touching application code.

---

## 01.3 Designing Machine-Enforceable Scope Boundaries

Never treat autonomy as a single global on/off switch. Define **four orthogonal scope dimensions** enforced deterministically in code (not in the prompt!):

```mermaid
flowchart TD
    Call["Agent Proposes Write Tool Call<br/>(e.g. issue_refund)"] --> D1{"1. Monetary Cap<br/>amount <= flagd.max_usd?"}
    D1 -->|"No"| Escalate["Escalate to Rung 2<br/>(Human Approval Queue)"]
    D1 -->|"Yes"| D2{"2. Reversibility<br/>Tool in safe allowlist?"}
    D2 -->|"No (e.g. delete_user)"| Escalate
    D2 -->|"Yes"| D3{"3. Verifier / Policy<br/>Schema + Z3/OPA pass?"}
    D3 -->|"No"| Escalate
    D3 -->|"Yes"| D4{"4. Velocity Cap<br/>< 3 actions / user / 24h?"}
    D4 -->|"No"| Escalate
    D4 -->|"Yes"| Exec["Auto-Execute (Rung 3)<br/>+ Emit OTel Audit Span"]
```

| Scope Dimension | Safe Rung 3 Example | Escalates to Rung 2 (Human) |
| :--- | :--- | :--- |
| **Monetary Cap** | `refund_amount <= \$25` | `refund_amount > \$25` |
| **Reversibility** | `add_ticket_tag`, `draft_note` | `delete_user`, `wire_payout`, `cancel_subscription` |
| **Verifier / Confidence** | Schema valid + policy pass + confidence `>= 0.90` | Missing order ID or confidence `< 0.90` |
| **Velocity / Rate Limit** | Max `3` auto-refunds per user/day | `>= 4` requests in 24h (fraud / loop protection) |

---

## 01.4 Common Mistakes

| # | Common Mistake | Why It Hurts | What To Do Instead |
| :---: | :--- | :--- | :--- |
| **1** | **Asking the LLM to enforce its own scope** (`"Don't refund over \$25"`) | Prompt injection or arithmetic errors bypass the rule | Enforce `amount <= max_auto_refund_usd` in **deterministic code / `flagd`** |
| **2** | **Alert fatigue in Rung 2** | Agent asks human approval for trivial read-only searches | Only gate **mutating / external write** tools; auto-run read-only lookups |
| **3** | **Skipping Rung 1 (Shadow) because CI evals passed** | Live messy inputs break edge-case tool calls on Day 1 | Always soak in Shadow Mode on real traffic before exposing users |
| **4** | **Treating autonomy as a single global boolean** | Forces you to either block everything or risk high-value irreversible actions | Enforce **monetary, reversibility, verifier, and velocity** bounds per call |

---

## 01.5 Key Takeaways

1. Climb trust step-by-step: **Shadow → Human-Approved → Scoped Autonomous → Expanded Production**.
2. Every graduation requires **objective production metrics** (action agreement rate, unedited approval rate, SLO compliance).
3. Enforce scope bounds (**dollar caps, reversibility, verifier gates, velocity limits**) in deterministic code backed by `flagd`, never via prompt instructions alone.

---

### Navigation

- **Next:** [Chapter 02 — OpenFeature & `flagd` for AI Runtime Control](./02_OpenFeature_and_flagd_for_AI_Runtime_Control.md)
- **Back to index:** [../index.md](../index.md)
