# Lecture 14 - Loop Engineering and A2A Protocol

> **Stage 1: Build** · **Phase:** 3 · Agency, Graphs & Loop Engineering · **Level:** 🟠 Advanced
> **Source:** `FDE S05 & S06` · **Master Map:** [`roadmap-v1.md`](../roadmap-v1.md)

---

## 🎯 Learning Goal

Architect resilient, bounded agent execution loops (`Plan-Act-Verify`) with stuck detection, proactive triggers, adaptive graph topologies, and Agent-to-Agent (`A2A`) delegation.

| Navigation | Links |
| :--- | :--- |
| **Prerequisites** | [Lecture 10](../Lecture%2010%20-%20AI%20Agents%20and%20HITL/) · [Lecture 13](../Lecture%2013%20-%20LangChain%20LangGraph%20LangSmith/) |
| **Unlocks** | [Lecture 24](../Lecture%2024%20-%20Enterprise%20Data%20Discovery%20and%20Apache%20Ossie/) · [Lecture 32](../Lecture%2032%20-%20Durable%20Execution%20with%20Inngest/) |

---

## 📚 Planned Chapter Syllabus (`notes/`)

Write one markdown file per chapter inside `notes/`, followed by `notes/Lecture_14_Complete_Notes.md`:

| # | Planned Chapter | Key Topics to Cover |
| :---: | :--- | :--- |
| **01** | **Beyond ReAct: Plan-Act-Verify Loops** | Separating explicit planning, tool execution, and verification phases to reduce drift. |
| **02** | **Bounded Goal Loops & Budget Enforcement** | Hard step limits, token/dollar circuit breakers, and tool permission boundaries. |
| **03** | **Proactive Triggers: Heartbeat, Cron & Events** | Moving from user-prompted chat to scheduled heartbeats and event-triggered loops. |
| **04** | **Stuck Detection, Retry, Pivot & Escalation** | Detecting repetitive tool-call cycles, changing strategy (pivot), and escalating to humans. |
| **05** | **Static vs. Adaptive Agent Graph Topologies** | When fixed DAGs break and how to spawn dynamic subgraphs at runtime. |
| **06** | **The A2A (Agent-to-Agent) Protocol** | Agent Cards, capability discovery, task states, streaming artifacts, and peer delegation. |
| **07** | **Parallel Delegation & Fan-In Synthesis** | Coordinating multiple specialized peer agents and reconciling conflicting outputs. |
| **08** | **Subagent Architectures: Context Isolation & Delegation** | Context quarantine, DeepAgents, Claude Code sub-agents, Antigravity SDK (`share`/`branch`, reactive wakeup), and Subagents vs. A2A. |

---

## 🛠️ What You Will Build (`code/`)

A TypeScript **Resilient Loop & A2A Orchestrator** (`code/`): a `Plan-Act-Verify` engine with cycle/stuck detection, hard budget caps, and an A2A client/server pair where a coordinator delegates sub-tasks to a specialist peer agent.

---

## 🏁 Release Gate (`Assignment/task.md`)

To mark **Lecture 14** complete, verify all of the following:

Inject an intentional infinite tool-failure loop: the engine must detect the stuck state within 3 iterations, trigger a pivot or human escalation, and never exceed its configured token budget.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Review syllabus & reference links below | ✅ |
| Write all chapter notes + `Lecture_14_Complete_Notes.md` in `notes/` | ✅ |
| Update `index.md` with links to every chapter | ✅ |
| Build & test the runnable implementation in `code/` | ✅ |
| Write & pass the completion gate in `Assignment/task.md` | ✅ |

---

## 📁 Layout

```text
Lecture 14 - Loop Engineering and A2A Protocol/
├── README.md          # this blueprint — goal · syllabus · build · gate · references
├── index.md           # chapter index (fill after writing notes/)
├── notes/             # chapter notes + Lecture_14_Complete_Notes.md
├── code/              # runnable TypeScript / Python / Infra implementation
└── Assignment/
    └── task.md        # hands-on assignment & release gate checklist
```

---

## 🔗 References & Resources

- [Google A2A (Agent2Agent) Protocol](https://google.github.io/A2A/)
- [LangGraph Adaptive Topologies](https://docs.langchain.com/oss/javascript/langgraph/graph-api)
- See [`../task.md`](../task.md) for the ready-to-run generation prompt for **Lecture 14**.
