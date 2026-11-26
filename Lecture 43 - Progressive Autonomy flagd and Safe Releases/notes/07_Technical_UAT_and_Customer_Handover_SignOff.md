# Chapter 07 — Technical UAT & Customer Handover Sign-Off

> **Lecture 43 · Chapter 07 of 07** · Level: 🟠 Advanced · Phase 10 — Quality, FinOps, Identity & Security
> **Source:** `FDE S18` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-43--progressive-autonomy-feature-flags-openfeatureflagd--safe-releases)

---

## 1. What Is Technical UAT for AI Systems?

Passing unit tests and developer evals proves *your code runs*. **Technical User Acceptance Testing (UAT)** proves to the **enterprise customer, security team, and operations team** that the AI system is safe, predictable, observable, and supportable before full production handover.

Unlike traditional UAT (*"Does clicking Submit save the form?"*), AI Technical UAT tests **probabilistic edge cases, guardrails, kill-switches, and financial limits**.

---

## 2. The 5-Pillar AI Technical UAT Script

Run these scripted scenarios live with the customer's engineering/ops stakeholders watching the OpenObserve dashboard and `flagd` console:

| UAT Scenario | Test Action | Expected Verifiable Outcome |
| :--- | :--- | :--- |
| **1. Happy-Path & Grounding** | Run 10 real customer domain queries | Accurate answers with valid citations; OTel trace links `tenant.id -> feature.id -> model -> tool` |
| **2. Progressive Autonomy Scope** | Trigger a \$15 refund vs. a \$150 refund | \$15 auto-executes (Rung 3); \$150 pauses for **Human Approval** (Rung 2) |
| **3. Instant `flagd` Kill-Switch** | Flip `autonomy_mode` to `human_approved` or `shadow` live | Takes effect in `< 5s` with **zero pod restarts** |
| **4. Automated Canary Rollback** | Inject a degraded canary (high failure/latency) | Controller auto-reverts `flagd` to baseline within **< 30s** and emits signed `ROLLBACK` manifest |
| **5. FinOps Hard Budget Cap** | Drive test tenant spend past 80% then 100% | Emits `WARN` at 80% and `BLOCK (429)` at 100%; FOCUS row matches `x_TraceId` |

---

## 3. Customer Handover Package (What You Leave Behind)

A Forward-Deployed Engineer (FDE) engagement isn't done until the customer's own team can operate the system without you:

1. **Signed Production Release Manifest:** Exact `modelId`, `prompt.sha256`, `skills[]`, and `flagd` config currently live.
2. **Runbooks & Incident Playbooks:** 1-page guides for *"How to roll back a model in `flagd`"*, *"How to pause autonomous mode"*, and *"How to raise a tenant budget cap"*.
3. **Observability & FinOps Dashboards:** Pre-built OpenObserve views for Task Success SLO, `p95 TTFT`, Drift Alerts, and FOCUS CPST by feature.
4. **Regression Eval Harness:** Automated CI script so the customer can safely test future model upgrades (e.g., next quarter's model release) using the exact same shadow $\rightarrow$ canary pipeline.
5. **Formal UAT Sign-Off Record:** Signed off by Product Owner, Security/Compliance Lead, and SRE Lead.

---

## 4. Chapter Summary
- **Technical UAT** validates live operational guarantees—autonomy boundaries, kill-switches, `<30s` canary rollback, and hard budgets—not just happy-path prompts.
- Complete handover requires a **signed release manifest, operational runbooks, dashboards, CI eval harness, and stakeholder sign-off**.

---
**Back to:** [Course Index](../index.md) | **Complete Guide:** [Lecture 43 Complete Notes](./Lecture_43_Complete_Notes.md)

