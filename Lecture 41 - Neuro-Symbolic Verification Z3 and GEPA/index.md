# Lecture 41 — Chapter Index

**Neuro-Symbolic Verification, Trajectory Evals, Z3 Constraints & GEPA**
Phase 10 · Quality, FinOps, Identity & Security · 🔴 Expert · **7 chapters**

> Source of truth for topics, goal, build task and gate: **[../roadmap-v1.md](../roadmap-v1.md)** → *"Lecture 41"*.
> Source mapping: `FDE S08`.

---

## 📚 Chapters

| # | Chapter | One-line summary | File |
| :---: | :--- | :--- | :--- |
| 01 | **Task Evaluation vs. Trajectory Evaluation** | Scoring tool recall, precondition ordering, argument accuracy, and step efficiency | [01_Task_Evaluation_vs_Trajectory_Evaluation.md](./notes/01_Task_Evaluation_vs_Trajectory_Evaluation.md) |
| 02 | **Tool-Action Correctness & Calibrated Judges** | Deterministic state checks first, calibrated binary/3-level LLM judges ($\ge 90\%$ agreement) | [02_Tool_Action_Correctness_and_Calibrated_Judges.md](./notes/02_Tool_Action_Correctness_and_Calibrated_Judges.md) |
| 03 | **Property-Based Testing for Stochastic Agents** | Universal invariants tested across 100+ randomized inputs + counterexample shrinking | [03_Property_Based_Testing_for_Stochastic_Agents.md](./notes/03_Property_Based_Testing_for_Stochastic_Agents.md) |
| 04 | **Neuro-Symbolic Verification & Deterministic Invariants** | Neural LLM proposals paired with 100% deterministic symbolic policy gates | [04_Neuro_Symbolic_Verification_and_Deterministic_Invariants.md](./notes/04_Neuro_Symbolic_Verification_and_Deterministic_Invariants.md) |
| 05 | **Z3 SMT Solver Constraints for Agent Plans** | Encoding ordering, cumulative budgets, and HITL thresholds as Z3 `SAT`/`UNSAT` constraints | [05_Z3_SMT_Solver_Constraints_for_Agent_Plans.md](./notes/05_Z3_SMT_Solver_Constraints_for_Agent_Plans.md) |
| 06 | **Evaluation-Driven Optimization (`GEPA`)** | Reflective prompt evolution from failure traces on a Pareto accuracy-vs-cost frontier | [06_Evaluation_Driven_Optimization_GEPA.md](./notes/06_Evaluation_Driven_Optimization_GEPA.md) |
| 07 | **Integrating Symbolic Gates into CI/CD** | Runtime Z3 gates (`< 10ms`) + CI/CD trajectory, PBT, and GEPA regression gates | [07_Integrating_Symbolic_Gates_into_CI_CD.md](./notes/07_Integrating_Symbolic_Gates_into_CI_CD.md) |

---

## 📄 Complete notes

A single consolidated document with the executive summary, architecture diagram, cheat sheet, and self-check questions:

👉 **[Lecture_41_Complete_Notes.md](./notes/Lecture_41_Complete_Notes.md)**

---

## 🔗 Related

- **[./code/Basic Code](./code/Basic%20Code)** — runnable TypeScript Trajectory Evaluator + `z3-solver` Policy Verifier + Property-Based Tester + GEPA Optimizer, release-gate tests, and chapter-wise `implementations guide/`
- **[./Assignment/task.md](./Assignment/task.md)** — hands-on assignment & release gate checklist
- **[./README.md](./README.md)** — lecture objectives, phase, level, source mapping and checklist
- **[../roadmap-v1.md](../roadmap-v1.md)** — complete topic list, goal, build task and completion gate

---

## 🧭 Reading order

```mermaid
flowchart LR
    C1["01 Trajectory Eval"] --> C2["02 Calibrated Judges"]
    C2 --> C3["03 Property Testing"]
    C3 --> C4["04 Neuro-Symbolic"]
    C4 --> C5["05 Z3 Solver"]
    C5 --> C6["06 GEPA Loop"]
    C6 --> C7["07 CI/CD Gates"]
    C7 --> N["Complete Notes"]
```

