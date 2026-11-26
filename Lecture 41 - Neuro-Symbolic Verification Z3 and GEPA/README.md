# Lecture 41 - Neuro-Symbolic Verification Z3 and GEPA

> **Stage 3: Ship** · **Phase:** 10 · Quality, FinOps, Identity & Security · **Level:** 🔴 Expert
> **Source:** `FDE S08` · **Master Map:** [`roadmap-v1.md`](../roadmap-v1.md)

---

## 🎯 Learning Goal

Go beyond final-answer evals with trajectory-level scoring, property-based testing, deterministic Z3 SMT solver invariants, and evaluation-driven prompt/program optimization (GEPA).

| Navigation | Links |
| :--- | :--- |
| **Prerequisites** | [Lecture 40](../Lecture%2040%20-%20Evals%20and%20Testing/) |
| **Unlocks** | [Lecture 43](../Lecture%2043%20-%20Progressive%20Autonomy%20flagd%20and%20Safe%20Releases/) |

---

## 📚 Planned Chapter Syllabus (`notes/`)

Write one markdown file per chapter inside `notes/`, followed by `notes/Lecture_41_Complete_Notes.md`:

| # | Planned Chapter | Key Topics to Cover |
| :---: | :--- | :--- |
| **01** | **Task Evaluation vs. Trajectory Evaluation** | Scoring intermediate tool selection, argument precision, and step efficiency. |
| **02** | **Tool-Action Correctness & Calibrated Judges** | Measuring side-effect accuracy and calibrating LLM judges against human labels. |
| **03** | **Property-Based Testing for Stochastic Agents** | Testing invariants across randomized inputs (fast-check / Hypothesis patterns). |
| **04** | **Neuro-Symbolic Verification & Deterministic Invariants** | Combining neural planners with symbolic rule checkers that never hallucinate. |
| **05** | **Z3 SMT Solver Constraints for Agent Plans** | Encoding business policies (budgets, approvals, time windows) as Z3 constraints. |
| **06** | **Evaluation-Driven Optimization (`GEPA`)** | Automatically mutating prompts, tool descriptions, and few-shots against eval feedback. |
| **07** | **Integrating Symbolic Gates into CI/CD** | Blocking unsafe or suboptimal agent trajectories before deployment. |

---

## 🛠️ What You Will Build (`code/`)

A **Trajectory Evaluator + Z3 Policy Verifier** (`code/`): scores multi-step agent traces, blocks policy-violating action plans using `z3-solver`, and runs a GEPA-style iterative prompt optimizer.

---

## 🏁 Release Gate (`Assignment/task.md`)

To mark **Lecture 41** complete, verify all of the following:

Z3 verifier rejects 100% of policy-violating action plans pre-execution; GEPA loop improves benchmark score measurably over baseline.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Review syllabus & reference links below | ☐ |
| Write all chapter notes + `Lecture_41_Complete_Notes.md` in `notes/` | ☐ |
| Update `index.md` with links to every chapter | ☐ |
| Build & test the runnable implementation in `code/` | ☐ |
| Write & pass the completion gate in `Assignment/task.md` | ☐ |

---

## 📁 Layout

```text
Lecture 41 - Neuro-Symbolic Verification Z3 and GEPA/
├── README.md          # this blueprint — goal · syllabus · build · gate · references
├── index.md           # chapter index (fill after writing notes/)
├── notes/             # chapter notes + Lecture_41_Complete_Notes.md
├── code/              # runnable TypeScript / Python / Infra implementation
└── Assignment/
    └── task.md        # hands-on assignment & release gate checklist
```

---

## 🔗 References & Resources

- [Z3 Theorem Prover (JS/TS `z3-solver`)](https://github.com/Z3Prover/z3)
- [GEPA: Reflective Prompt Evolution](https://arxiv.org/abs/2507.19457)
- See [`../task.md`](../task.md) for the ready-to-run generation prompt for **Lecture 41**.
