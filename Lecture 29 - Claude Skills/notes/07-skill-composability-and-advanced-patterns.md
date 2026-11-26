# 📘 Chapter 7 — Skill Composability & Advanced Patterns

## 1. Chapter Overview

The previous chapters established architectural patterns for single Skills. This chapter focuses on **combining Skills** and **advanced patterns** that emerge when multiple Skills interact, when Skills must coordinate with complex workflows, and when Skills need to adapt to dynamic contexts.

### The Core Idea

Skills are **modular** and **composable**. A complex task rarely maps to a single Skill. Instead, multiple Skills can be composed to handle:

- Different sub-tasks within a larger workflow
- Different tool domains (MCP servers)
- Different stages of refinement
- Different governance layers

This chapter covers:

- Skill composition strategies
- Advanced patterns beyond the core five
- Cross-Skill coordination
- State management across composed Skills
- Progressive disclosure in composed systems

---

## 2. Skill Composition Strategies

### 2.1. Parallel Composition

When sub-tasks can execute independently and concurrently.

```mermaid
flowchart TB
    UR["User Request"] --> S1["Skill A"]
    UR --> S2["Skill B"]
    UR --> S3["Skill C"]

    S1 --> O1["Output A"]
    S2 --> O2["Output B"]
    S3 --> O3["Output C"]

    O1 --> COMB["Combine Results"]
    O2 --> COMB
    O3 --> COMB
    COMB --> FINAL["Final Output"]
```

**Example:** "Design a landing page, create API endpoints, and set up the database schema" — these can run in parallel once requirements are gathered.

### 2.2. Sequential Composition

When Skills must execute in a defined order, with each Skill's output becoming the next Skill's input.

```mermaid
flowchart LR
    UR["User Request"] --> S1["Skill A"]
    S1 -->|Result: R1| S2["Skill B"]
    S2 -->|Result: R2| S3["Skill C"]
    S3 --> FINAL["Final Output"]
```

**Example:** "Onboard a customer" → Design Skill → Provisioning Skill → Notification Skill.

### 2.3. Refinement Loop Composition

When iterative improvement spans multiple Skills, each contributing to the refinement.

```mermaid
flowchart TD
    GENERATE["Generate Draft"] --> S1["Skill A: Structure"]
    S1 --> S2["Skill B: Style Check"]
    S2 --> S3["Skill C: Fact Validation"]
    S3 -->|Issues Found| S4["Skill D: Improve"]
    S4 --> S1
    S4 --> S2
    S4 --> S3
    S1 -->|No Issues| FINAL["Final Output"]
```

**Example:** Report generation where each Skill validates a different concern (structure, style, facts).

### 2.4. Guardrails & Governance Composition

When multiple governance Skills wrap a core workflow Skill.

```mermaid
flowchart TD
    U["User Request"] --> G1["Governance Skill 1"]
    G1 -->|Allowed| G2["Governance Skill 2"]
    G2 -->|Allowed| W["Core Workflow Skill"]
    G1 -->|Blocked| X["Stop + Explain"]
    G2 -->|Blocked| X

    W --> V["Validation"]
    V --> O["Final Output"]
```

**Example:** Financial workflow where compliance and permission checks wrap the payment execution.

### 2.5. Conditional Composition

When which Skills activate depends on runtime context.

```mermaid
flowchart TD
    U["User Request"] --> A["Context Analyzer"]
    A -->|Pattern X| S1["Skill X"]
    A -->|Pattern Y| S2["Skill Y"]
    A -->|No Match| Default["Default Behavior"]
```

**Example:** File storage where the file type determines which storage Skill activates.

---

## 3. Advanced Patterns Beyond the Core Five

### 3.1. Pattern 6 — Cross-Skill Negotiation

When two Skills need to agree on how to proceed with a shared sub-task.

**Negotiation Flow:**

```mermaid
flowchart LR
    S1["Skill A"] <-->|Propose| S2["Skill B"]
    S2 -->|Accept/Reject| S1
    S1 -->|Refine Proposal| S2
    S1 -->|Agreed| EXEC["Execute"]
```

**Use Case:** Two design Skills negotiating which design direction to pursue for a given component.

### 3.2. Pattern 7 — State-Preserving Composition

When Skills must share and preserve state across composition without losing context.

```mermaid
flowchart TB
    S1["Skill A"] -->|State: S| CONTEXT["Shared Context"]
    S2["Skill B"] -->|State: S| CONTEXT
    S3["Skill C"] -->|State: S| CONTEXT
    CONTEXT -->|Recall| S1
    CONTEXT -->|Recall| S2
    CONTEXT -->|Recall| S3
```

**Use Case:** Multi-step workflow where each Skill adds to a shared context (e.g., accumulating design requirements, project constraints, stakeholder preferences).

### 3.3. Pattern 8 — Timeout & Deadline Composition

When a composed workflow must respect time constraints, and Skills must know when to yield or handoff.

```mermaid
flowchart TD
    TIMER["Deadline Timer"] -->|Expires| S1["Skill A"]
    S1 -->|Timeout| Handoff["Handoff to Skill B"]
    S1 -->|Within Time| Complete["Complete Step"]
```

**Use Case:** Long-running workflows where each Skill must complete within allocated time slices.

### 3.4. Pattern 9 — Rollback Composition

When a composed workflow requires coordinated rollback across multiple Skills if any step fails.

```mermaid
flowchart LR
    S1 -->|Step 1 OK| S2["Skill B"]
    S2 -->|Step 2 OK| S3["Skill C"]
    S3 -->|Step 3 FAIL| R1["Skill A Rollback"]
    R1 -->|Compensate| S1
    R1 -->|Compensate| S2
```

**Use Case:** When Skill A creates a resource, Skill B modifies it, and Skill C deletes it — if any step fails, all previous Skills must execute compensation.

### 3.5. Pattern 10 — Progressive Disclosure Composition

When composed Skills each apply progressive disclosure independently, and the agent must navigate between them.

```mermaid
flowchart TB
    META1["Skill A Metadata"] -->|Load| INST_A["Skill A Instructions"]
    META2["Skill B Metadata"] -->|Load| INST_B["Skill B Instructions"]
    INST_A -->|Progressive| REF_A["Skill A References"]
    INST_B -->|Progressive| REF_B["Skill B References"]
    REF_A -->|Navigate| REF_B
    REF_B -->|Navigate| REF_A
```

**Use Case:** When multiple Skills are active simultaneously, each manages its own disclosure layers without overwhelming the agent's context.

---

## 4. Cross-Skill Coordination Patterns

### 4.1. Skill Handfformation

When one Skill explicitly hands off to another Skill.

**Example:** "Analyze this design" → Design Skill → "Now create tickets" → Development Skill

**Implementation Pattern:**

```markdown
## Handoff to Another Skill

If the user's need expands beyond my scope, I may hand off to another Skill:

> "For project planning and task creation, the `sprint-planner` Skill handles those workflows. I'll activate it now."

- Skill A explicitly references Skill B by name
- Skill A may pass relevant context/state to Skill B
- Skill A does not attempt to execute Skill B's workflow
- The agent coordinates which Skill is active at any time
```

### 4.2. Skill as Plugin

When a Skill discovers and loads another Skill dynamically based on runtime conditions.

**Implementation Pattern:**

```markdown
## Dynamic Skill Loading

When encountering unknown domains:

1. Assess whether an existing Skill covers this domain
2. If yes, activate that Skill with relevant parameters
3. If no, note the gap and proceed with available Skills
4. Return partial results + gap summary to user
```

### 4.3. Shared Context across Skills

When Skills share a common context object that persists across Skill activations.

**Implementation Pattern (pseudo-code):**

```typescript
// Shared context persisted across Skill activations
interface SkillContext {
  userId: string
  projectId?: string
  sessionId: string
  accumulatedData: Record<string, any>
  previousSkills: string[]
  workflowState: 'idle' | 'in_progress' | 'complete' | 'failed'
}

// Each Skill can read and update context
skillA.execute(context) // may update accumulatedData
skillB.execute(context) // reads accumulatedData from skillA
```

---

## 5. State Management in Composed Systems

### 5.1. Transaction Boundaries

When composing Skills, define clear transaction boundaries.

**Pattern:**

```text
Before: Define what constitutes a "transaction"
        ↓
During: Each Skill knows which parts of the state it owns
        ↓
After: Compensation is defined for each transaction boundary
```

### 5.2. Idempotency

Skills in a composition should be **idempotent** where possible — executing them multiple times produces the same result.

**Implementation:**
- Use unique identifiers for operations
- Check existing state before creating
- Report "already exists" rather than re-creating

### 5.3. Error Propagation

When a Skill in a composition fails, define:

1. Which preceding Skills must execute compensation
2. Which subsequent Skills should not execute
3. What partial results to report to the user

**Pattern:**

```text
Skill A fails → Execute A's compensation → Report to user
Skills B, C after A → Skip execution → Report "partial completion"
```

---

## 6. Progressive Disclosure in Composed Systems

When multiple Skills are active, progressive disclosure becomes critical to avoid context overload.

### 6.1. Layered Activation

Only load the metadata and core instructions for currently active Skills. Deeper references load on demand.

### 6.2. Context Budgets

Allocate context budget per Skill:

```text
Total context: 100%
Skill A: 40% (core workflow)
Skill B: 30% (secondary concerns)
References: 20% (on-demand)
Reserve: 10% (user turns, conversation history)
```

### 6.3. Selective Disclosure

Each Skill decides what to disclose at each level:

| Level | Skill A | Skill B |
|---|---|---|
| Metadata | ✓ Always | ✓ Always |
| Core Instructions | ✓ Relevant | ✓ Relevant |
| Detailed References | ✓ On demand | ✓ On demand |
| Scripts | ✓ Execute if needed | ✓ Execute if needed |
| Assets | ✓ Load if referenced | ✓ Load if referenced |

---

## 7. Composability Checklist

Before composing Skills, verify:

```text
[ ] Each Skill has a clearly defined scope (no overlap ambiguity)
[ ] Input/output contracts are compatible between Skills
[ ] Governance/permission layers are defined
[ ] Compensation/rollback is defined for each Skill
[ ] Progressive disclosure is configured for each Skill
[ ] State management strategy is documented
[ ] Error propagation paths are defined
[ ] Timeout/deadline limits are set
[ ] Handoff conditions are specified
```

---

## 8. Interview Questions

### Q1. How do you compose multiple Skills for a complex task?

> I identify the sub-tasks required, then determine which Skills handle each sub-task. I define clear input/output contracts between Skills, establish governance layers, and design compensation logic for failures. Progressive disclosure ensures no single Skill overwhelms the agent's context.

### Q2. What is cross-Skill negotiation?

> When two or more Skills need to agree on how to proceed with a shared sub-task. Each Skill proposes an approach, and the agent (or a coordinating Skill) evaluates the proposals and selects one. This prevents conflicting approaches within the same workflow.

### Q3. How do you manage state across composed Skills?

> I use a shared context that persists across Skill activations. Each Skill reads and updates the context according to defined contracts. Idempotent operations and clear transaction boundaries prevent state corruption. Compensation logic is defined for each transaction boundary.

### Q4. What happens when a Skill in a composed workflow fails?

> I define rollback compensation for each preceding Skill, skip subsequent Skills that depend on the failed step, and report partial completion to the user. The system never claims success when any component failed.

### Q5. How do you avoid context overload when multiple Skills are active?

> I use progressive disclosure: only load metadata and core instructions for active Skills. Deeper references load on demand. I allocate context budgets per Skill and use selective disclosure to ensure critical information is always available.

---

## 9. Chapter References

- Previous: **Chapter 6 — Resources, Checklists & Reference Templates**
- This chapter introduces composability patterns beyond single-Skill design

---

## 10. Final Mental Model — Skill Composition

```text
Single Skill
  ↓
Composition Strategies (parallel, sequential, refinement, guardrails, conditional)
  ↓
Advanced Patterns (negotiation, state-preserving, timeout, rollback, progressive disclosure)
  ↓
Cross-Skill Coordination (handoff, plugin, shared context)
  ↓
State Management (transactions, idempotency, error propagation)
  ↓
Production Composability
```

**Key takeaway:** Skills become truly powerful when they can be composed. A single Skill automates a workflow; composed Skills enable complex, adaptive, multi-domain agent systems.