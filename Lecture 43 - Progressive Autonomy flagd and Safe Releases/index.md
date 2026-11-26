# Lecture 43 — Progressive Autonomy (`OpenFeature`, `flagd`) & Safe Releases: Course Index

> **Goal:** Ship model migrations, prompt updates, and agent autonomy safely using the Progressive Autonomy Ladder, `OpenFeature` + `flagd`, side-effect-free shadow mode, evaluation-gated canaries with `< 30s` automated rollback, signed release manifests, and Technical UAT.

---

## Chapter Notes (`notes/`)

| # | Chapter | Focus | Link |
| :---: | :--- | :--- | :--- |
| 01 | **The Progressive Autonomy Ladder** | Shadow $\rightarrow$ Human-Approved $\rightarrow$ Scoped Autonomous $\rightarrow$ Expanded Production | [01_The_Progressive_Autonomy_Ladder.md](./notes/01_The_Progressive_Autonomy_Ladder.md) |
| 02 | **OpenFeature & `flagd` for AI Runtime Control** | Decoupling model/prompt/autonomy routing from deploys via `flagd` JSON rules | [02_OpenFeature_and_flagd_for_AI_Runtime_Control.md](./notes/02_OpenFeature_and_flagd_for_AI_Runtime_Control.md) |
| 03 | **Shadow Mode & Dark Launches** | Async candidate mirroring with mocked write tools & action equivalence | [03_Shadow_Mode_and_Dark_Launches.md](./notes/03_Shadow_Mode_and_Dark_Launches.md) |
| 04 | **Evaluation-Gated Canary Rollouts** | Staged `1% -> 10% -> 50% -> 100%` promotion gated by live quality/latency/cost | [04_Evaluation_Gated_Canary_Rollouts.md](./notes/04_Evaluation_Gated_Canary_Rollouts.md) |
| 05 | **Versioning Prompts, Models & Skills + Release Manifests** | Immutable signed manifests binding code, model, prompt hash, and skills | [05_Versioning_Prompts_Models_Skills_and_Release_Manifests.md](./notes/05_Versioning_Prompts_Models_Skills_and_Release_Manifests.md) |
| 06 | **Automated Rollback & Incident Recovery** | `< 30s` closed-loop `flagd` circuit breaker & 6-step model migration playbook | [06_Automated_Rollback_and_Incident_Recovery.md](./notes/06_Automated_Rollback_and_Incident_Recovery.md) |
| 07 | **Technical UAT & Customer Handover Sign-Off** | 5-pillar UAT script, runbooks, and enterprise handover package | [07_Technical_UAT_and_Customer_Handover_SignOff.md](./notes/07_Technical_UAT_and_Customer_Handover_SignOff.md) |
| — | **Complete Notes** | End-to-end summary & release-gate checklist | [Lecture_43_Complete_Notes.md](./notes/Lecture_43_Complete_Notes.md) |

---

## Code & Implementation (`code/Basic Code/`)

| Artifact | Description | Link |
| :--- | :--- | :--- |
| **Basic Code Project** | `OpenFeature` + `flagd` JSON provider, Shadow Mode comparator, Canary Rollback Controller, and HMAC-SHA256 Signed Release Manifests | [code/Basic Code/](./code/Basic%20Code/package.json) |
| **Implementation Guide** | Chapter-by-chapter walkthrough with full source code and explanations | [implementations guide/](./code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) |
| **Assignment & Release Gate** | Acceptance criteria, verification commands, and self-check rubric | [Assignment/task.md](./Assignment/task.md) |

