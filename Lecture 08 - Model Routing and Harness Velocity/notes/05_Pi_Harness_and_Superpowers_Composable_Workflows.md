# Chapter 05 — Pi Harness & Superpowers Composable Workflows

> **Lecture 08 · Chapter 05 of 07** · Level: 🟡 Intermediate · Phase 2 — Application Layer & Harness Velocity
> **Source:** `FDE S02` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-08--model-routing--agent-harness-velocity-agentsmd-pi-sddtdd)
> **Roadmap topics:** Minimalist coding harnesses (`Pi`) · four core primitives (`read`, `write`, `edit`, `bash`) · composable workflow skills (`Superpowers`) · skill chaining · subagent isolation vs. monolithic prompts.

---

## 05.0 What this chapter is for

Recall the core equation from [Lecture 13](../../Lecture%2013%20-%20LangChain%20LangGraph%20LangSmith/notes/02_What_is_an_AI_Agent_Model_and_Harness.md):

$$\text{Agent} = \text{Model} + \text{Harness}$$

Many teams assume that making an agent smarter requires stuffing 40 specialized tools and 10,000 tokens of framework boilerplate into the context window. In practice, **bloated harnesses slow models down, break prefix caching, and increase tool-selection errors.**

The **`Pi` coding harness** and **`Superpowers`** workflow methodology demonstrate the opposite philosophy: **a tiny, deterministic core harness paired with composable, on-demand workflow skills.**

By the end of this chapter you should be able to:

1. Explain the **`Pi` minimalist harness philosophy** and why four primitives (`read`, `write`, `edit`, `bash`) cover 95% of software engineering.
2. Design **composable workflow skills (`Superpowers`)** that load progressively into the agent's context only when triggered.
3. Chain skills into deterministic engineering pipelines (`brainstorm` $\rightarrow$ `write-plan` $\rightarrow$ `execute-plan` $\rightarrow$ `verify`).
4. Decide when to use **single-context skill chaining** vs. **isolated subagent dispatch**.

---

## 05.1 The `Pi` minimalist coding harness

`Pi` (and similar minimal terminal harnesses) strips the agent runtime down to the bare essentials:

| Component | What `Pi` Provides | Why Minimalism Wins |
| :--- | :--- | :--- |
| **1. Core Toolset** | `read`, `write`, `edit`, `bash` | Only 4 JSON schemas in the static prefix ($\sim 400$ tokens total vs. $6{,}000+$ tokens for 30 tools). |
| **2. Context Loader** | Automatic `AGENTS.md` discovery (global + project + subdir) | Keeps repo rules consistent without hardcoding them in the harness binary. |
| **3. Extension / Skill Hook** | Loads `SKILL.md` playbooks on demand | Capabilities scale infinitely on disk without bloating every turn's prompt. |
| **4. Session & Compaction** | Tree-structured session history + explicit compaction | Prevents context rot on long debugging sessions. |

```mermaid
flowchart LR
    subgraph Minimal_Core["Pi Minimal Harness (~400 tool tokens)"]
        T1["read"]
        T2["write"]
        T3["edit"]
        T4["bash"]
    end
    subgraph On_Demand["Progressive Skills (Loaded Only When Needed)"]
        S1["brainstorm.md"]
        S2["tdd-cycle.md"]
        S3["code-review.md"]
        S4["git-worktree.md"]
    end
    Minimal_Core -->|"Triggered by task"| On_Demand
```

> [!IMPORTANT]
> **Why `bash` replaces 20 bespoke tools (Token Math):**
> Suppose a bloated harness registers 35 JSON tool schemas (`~200` tokens each = **`7,000` tokens** in every turn's prompt). Over a 15-turn debugging loop, you pay to prefill `7,000 × 15 = 105,000` schema tokens—and the model still confuses `git_diff_staged` with `git_diff_files`!
> With `Pi`'s 4 primitives (`read`, `write`, `edit`, `bash`), tool schemas take only **`~400` tokens** (`400 × 15 = 6,000` tokens—**94% fewer schema tokens**) and the model uses standard POSIX/CLI commands it already mastered during pretraining.

---

## 05.2 `Superpowers`: Composable engineering workflows

**Superpowers** is a library of structured, composable `SKILL.md` workflows layered on top of a coding harness. Instead of asking an LLM *"build feature X"* in one unstructured prompt, Superpowers enforces a **repeatable engineering state machine**:

| Skill Phase | What It Enforces | Output Artifact |
| :--- | :--- | :--- |
| **1. `brainstorming`** | Socratic clarification of edge cases, constraints, and non-goals *before* writing code | Approved design spec (`docs/plans/<feature>-spec.md`) |
| **2. `using-git-worktrees`** | Isolates work in a fresh branch/worktree so main stays clean | Clean isolated workspace |
| **3. `writing-plans`** | Breaks the spec into 2–5 minute atomic tasks with exact file paths and test commands | Executable step-by-step plan |
| **4. `subagent-driven-development` / `tdd`** | Dispatches each task with strict Red $\rightarrow$ Green $\rightarrow$ Refactor verification | Passing unit + integration tests |
| **5. `requesting-code-review`** | Independent reviewer checks diff against spec & `AGENTS.md` invariants | Review verdict (`APPROVE` / `CHANGES_REQUESTED`) |
| **6. `finishing-a-development-branch`** | Runs full release gate, cleans up worktree, prepares PR/merge | Verified commit |

### Why composability beats monolithic "god prompts"

If you put all 6 phases into one 4,000-word system prompt, the model rushes straight to writing code and skips verification. By **packaging each phase as a small, focused skill** with an explicit exit gate (e.g., *"Do not write implementation code until the user approves the spec"*), the harness guarantees discipline at every step.

---

## 05.3 Skill structure & progressive loading

A composable skill follows a lightweight markdown contract:

```markdown
---
name: tdd-patch-cycle
description: Enforce Red-Green-Refactor when implementing a spec task.
---

# TDD Patch Cycle

## Preconditions
- A written spec or task requirement exists.

## Procedure
1. **RED:** Write a failing test in `*.test.ts` that asserts the new behavior.
2. Run the test command and **observe the failure** (if it passes immediately, the test is wrong).
3. **GREEN:** Write the minimal implementation to make the test pass.
4. **REFACTOR:** Clean up duplication while keeping all tests green.
5. **GATE:** Run `npm run typecheck && npm test` before reporting completion.
```

Notice how **model routing** (Chapters 01–02) pairs naturally with **Superpowers**:
- **`brainstorming` & `writing-plans`** $\rightarrow$ Route to **System-2 (Deliberative)** model (high leverage; mistakes here waste hours).
- **`tdd-patch-cycle` (boilerplate/unit tests)** $\rightarrow$ Route to **System-1 (Fast)** model with automatic escalation to System-2 if the test fails twice.
- **`requesting-code-review`** $\rightarrow$ Route to an **independent System-2** model instance (fresh context, no author bias).

---

## 05.4 Key takeaways

1. **Keep the harness small (`read`, `write`, `edit`, `bash`).** Tool-schema minimalism maximizes prefix cache hits and reduces tool-calling errors.
2. **Externalize workflows into composable skills (`Superpowers`).** Load only the active phase's instructions into context.
3. **Pair skill phases with model tiers:** Use System-2 for planning and independent review; use System-1 + deterministic test gates for fast implementation loops.

---

**Next:** [Chapter 06 — Spec-Driven (SDD) & Test-Driven (TDD) Agent Velocity](./06_Spec_Driven_and_Test_Driven_Agent_Velocity.md)

