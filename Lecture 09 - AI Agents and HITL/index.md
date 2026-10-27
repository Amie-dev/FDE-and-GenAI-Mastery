# Lecture 09 — AI Agents & HITL · Chapter Index

> **Phase:** 3 · Agency & Contracts · **Level:** 🟡 Intermediate · **Prerequisites:** Lecture 08
> **Goal:** understand what an "agent" really is — a loop with tools and constraints — and how to keep it from
> hurting anything.
> **Gate:** you can describe the blast radius of your agent and the exact control that limits it.

---

## 📚 Chapters

| # | Chapter | One-line summary | File |
| :---: | :--- | :--- | :--- |
| 01 | **First Principles of AI Agents & the Agency Spectrum** | An LLM has no sensors and no actuators; agency is a **spectrum of four progressive levels**, and the difference between them is *who decides the next step* and *how many decisions chain*. The **6-component model**, brain + loop + tools, agent vs workflow, and what an agent is **not**. | [01_First_Principles_of_AI_Agents_and_the_Agency_Spectrum.md](./notes/01_First_Principles_of_AI_Agents_and_the_Agency_Spectrum.md) |
| 02 | **Agent Architecture: Components & the Request Lifecycle** | The reference architecture and the split that defines the whole lecture — **what the model owns** (interpretation · selection · synthesis) versus **what the runtime owns** (permissions · budgets · retries · persistence · truth). The full request lifecycle, the layer map, and the two formulas reconciled. | [02_Agent_Architecture_Components_and_Request_Lifecycle.md](./notes/02_Agent_Architecture_Components_and_Request_Lifecycle.md) |
| 03 | **The Agent Loop: Perceive → Decide → Act & State Machines** | The fundamental loop, and why an **explicit state machine** beats `while (true)` — every terminal state is named, so every terminal state is testable. Agent state, the tool runner, the four-stage act pipeline, **never trust tool arguments**, dynamic error recovery, and why recovery ≠ unlimited retry. | [03_The_Agent_Loop_Perceive_Decide_Act_and_State_Machines.md](./notes/03_The_Agent_Loop_Perceive_Decide_Act_and_State_Machines.md) |
| 04 | **Loop Engineering & Harness Engineering** | Why `while (true)` is dangerous, and the **four brakes** that fix it — steps · wall clock · token ceiling · repetition — plus the **six named termination conditions**, the causal **trace**, the `O(N²)` token ledger, the six classic failure modes and the full defensive pipeline. | [04_Loop_Engineering_and_Harness_Engineering.md](./notes/04_Loop_Engineering_and_Harness_Engineering.md) |
| 05 | **Workspace Sandboxing & Agent Security** | **Tool = capability + permission**, and a sandbox is an *architecture, not a sentence*. The five threat vectors for filesystem agents, the **`safePath` resolver** with its two mandatory containment checks, the four hardened workspace tools, the four isolation tiers, the three isolation axes and the quota set. | [05_Workspace_Sandboxing_and_Agent_Security.md](./notes/05_Workspace_Sandboxing_and_Agent_Security.md) |
| 06 | **Building an Autonomous Website-Builder Agent** | From *advice* to *actuation*: a system prompt that is a **job description**, four narrow tools that are the agent's entire capability surface, a controller that owns only HTTP and an engine that owns all the sequencing — and the **environmental feedback loop** that makes `readFile` a capability multiplier. | [06_Building_an_Autonomous_Website_Builder_Agent.md](./notes/06_Building_an_Autonomous_Website_Builder_Agent.md) |
| 07 | **Human-in-the-Loop & the 3-Tier Tool Authorization Matrix** | Not every action deserves the same autonomy: the **3-tier matrix** (read-only · scoped mutate · critical), the classification decision tree, synchronous vs **asynchronous durable HITL**, the pause/resume state machine, the resumption webhook's five correctness requirements and the **two layers of idempotency**. | [07_Human_in_the_Loop_and_Tool_Authorization_Tiers.md](./notes/07_Human_in_the_Loop_and_Tool_Authorization_Tiers.md) |
| 08 | **RBAC, the Defensive Wrapper & Platform Guardrails** | **The model is not part of the authorization path.** RBAC, object-level checks and ABAC; blast radius; why a jailbreak is not an authorization bypass; the **defensive wrapper** with a 0–100 risk score and an output gate; wrapper vs guardrail vs firewall; and the SIEM/SOC audit trail. | [08_RBAC_Defensive_Wrapper_and_Platform_Guardrails.md](./notes/08_RBAC_Defensive_Wrapper_and_Platform_Guardrails.md) |
| 09 | **Enterprise Agent Patterns, Failure Modes & the 25 Cardinal Principles** | Pure workflow vs pure agent vs the **hybrid golden pattern**; the four enterprise topologies; four failure classes; **"the application is the kernel"**; the production-readiness maturity model; and the 25 principles that tie the whole lecture together. | [09_Enterprise_Agent_Patterns_Failure_Modes_and_the_25_Principles.md](./notes/09_Enterprise_Agent_Patterns_Failure_Modes_and_the_25_Principles.md) |
| — | **Lecture 09 — Complete Notes** | Consolidated revision layer: executive summary, master diagram, cheat sheet, seven decision tables, **20 misconceptions**, glossary and **20 self-check questions**. | [Lecture_09_Complete_Notes.md](./notes/Lecture_09_Complete_Notes.md) |

**Chapter count: 9** (within the 5–10 limit for this lecture).

---

## 🧭 Reading paths

| Situation | Read |
| :--- | :--- |
| First pass, start to finish | 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 |
| "What even *is* an agent, and is mine one?" | [01](./notes/01_First_Principles_of_AI_Agents_and_the_Agency_Spectrum.md) §01.1–§01.3, §01.6, §01.7 |
| "Where do I put my code?" | [02](./notes/02_Agent_Architecture_Components_and_Request_Lifecycle.md) §02.2, §02.4 |
| "My agent loops forever / stops for no reason" | [03](./notes/03_The_Agent_Loop_Perceive_Decide_Act_and_State_Machines.md) §03.7 · [04](./notes/04_Loop_Engineering_and_Harness_Engineering.md) §04.2, §04.6 |
| "It costs too much" | [04](./notes/04_Loop_Engineering_and_Harness_Engineering.md) §04.4, §04.7 |
| "It keeps doing the same thing" | [04](./notes/04_Loop_Engineering_and_Harness_Engineering.md) §04.5 |
| "It wrote outside the workspace" | [05](./notes/05_Workspace_Sandboxing_and_Agent_Security.md) §05.3, §05.4 |
| "How do I let it act safely?" | [05](./notes/05_Workspace_Sandboxing_and_Agent_Security.md) §05.5, §05.6, §05.8 |
| "It writes files but never checks them" | [06](./notes/06_Building_an_Autonomous_Website_Builder_Agent.md) §06.6 |
| "A destructive action fired without a human" | [07](./notes/07_Human_in_the_Loop_and_Tool_Authorization_Tiers.md) §07.2, §07.4 |
| "The approval webhook ran the refund twice" | [07](./notes/07_Human_in_the_Loop_and_Tool_Authorization_Tiers.md) §07.6 |
| "A user says they're the admin" | [08](./notes/08_RBAC_Defensive_Wrapper_and_Platform_Guardrails.md) §08.3, §08.5 |
| "A user changed an id and read someone else's data" | [08](./notes/08_RBAC_Defensive_Wrapper_and_Platform_Guardrails.md) §08.6.2 |
| "Someone is probing the model" | [08](./notes/08_RBAC_Defensive_Wrapper_and_Platform_Guardrails.md) §08.7, §08.9 |
| "Is this safe to ship?" | [05](./notes/05_Workspace_Sandboxing_and_Agent_Security.md) §05.8 · [08](./notes/08_RBAC_Defensive_Wrapper_and_Platform_Guardrails.md) §08.10, §08.11 |
| "Should this be an agent at all?" | [09](./notes/09_Enterprise_Agent_Patterns_Failure_Modes_and_the_25_Principles.md) §09.1 |
| Preparing for an interview | [Lecture_09_Complete_Notes.md](./notes/Lecture_09_Complete_Notes.md) §1, §3, §5, §7 |

---

## 🔗 Related workspace links

| Item | Link | Status |
| :--- | :--- | :---: |
| Lecture workspace / checklist | [📄 README.md](./README.md) | ✅ |
| Generation prompt (git-ignored) | [📄 prompt.md](./prompt.md) | ✅ |
| Chapter notes | [📂 notes/](./notes/) | ✅ 9 chapters + complete notes |
| Basic Code | [📂 code/Basic Code](./code/Basic%20Code/) | ✅ 15 files + 10-chapter guide |
| Production Code | [📂 code/](./code/) | 🔜 to build |
| Lecture assignment | [📝 Assignment/task.md](./Assignment/task.md) | ✅ 172 questions · 48 checks · capstone · gate |
| Answer sheet template | [📝 Assignment/answers-template.md](./Assignment/answers-template.md) | ✅ |
| Roadmap — Lecture 09 topics, build & gate | [🗺️ ../roadmap.md](../roadmap.md) | ✅ |
| Repository chapter index (all lectures) | [📚 ../index.md](../index.md) | ✅ |

---

## 🔗 Source references

- `Forward-Deployed-Engineer/Lecture 05/notes/04…07`
  (`04_Agency_Spectrum…` · `05_Workspace_Sandboxing…` · `06_Building_an_Autonomous_Website_Builder_Agent.md` ·
  `07_Human_In_The_Loop…`)
- `gen-ai-cohort/week01/learning/day02/notes/05 agent-architecture-and-loops.md`
- `gen-ai-cohort/week02/learning/day03/notes/01-ai-agent-architecture.md`
- `gen-ai-cohort/week02/learning/day03/notes/3.1/3.2-Defensive Wrapper.md`
- `gen-ai-cohort/week02/learning/day03/notes/3.1/3.3-Role-Based Access Control (RBAC) + Platform-Level Guardrails.md`

---

### Navigation

- **Previous lecture:** [Lecture 08 — Tool Calling](../Lecture%2008%20-%20Tool%20Calling/index.md)
- **Next lecture:** [Lecture 10 — Structured Outputs](../Lecture%2010%20-%20Structured%20Outputs/index.md)


