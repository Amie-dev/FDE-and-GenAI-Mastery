# Chapter 10 — What is LangGraph and Why Use It?

> **Reference:** `langchain_langgraph-main/notes/chapter-7.md` · `chapter-8.md` · [LangGraph Overview](https://docs.langchain.com/oss/javascript/langgraph/overview)

---

## 1. What is LangGraph?

**LangGraph** is a **low-level orchestration framework and runtime** engineered specifically for building, coordinating, and deploying **long-running, stateful, multi-actor AI agent systems**.

From the official [LangGraph documentation](https://docs.langchain.com/oss/javascript/langgraph/overview):

> *"LangGraph is a low-level orchestration framework and runtime for building, managing, and deploying long-running, stateful agents."*

```
Simple Analogy:
• A flowchart drawn on a whiteboard = Your workflow design
• The workers at each desk doing specific tasks = Nodes (Functions)
• The arrows deciding who gets the paperwork next = Edges (Routing)
• The shared clipboard passed between desks = State (Shared Data)
```

**One-line summary:**  
> LangGraph lets you build AI applications as **graphs of state, nodes, and edges** — with cycles, memory, and complete control over every step.

---

## 2. LangChain vs. LangGraph: Framework vs. Runtime

| Dimension | LangChain (`createAgent`) | LangGraph (`StateGraph`) |
| :--- | :--- | :--- |
| **Abstraction Level** | High-level **framework** | Low-level **runtime engine** |
| **Best For** | Standard tool-calling agents & chat loops | Custom multi-step pipelines & enterprise workflows |
| **Control Flow** | Fixed while-loop hidden under the hood | Explicit directed graph designed by you |
| **What You Define** | Model, tools list, system prompt | StateSchema, node functions, normal/conditional edges |
| **Deterministic Steps**| Awkward (everything is driven by prompt) | First-class citizen (pure JavaScript functions) |
| **Architectural Role** | Client-facing interface | The execution engine underneath |

> **Key Architectural Insight:**  
> LangChain 1.0's `createAgent()` is **built on top of LangGraph**. You don't need to write graph code for simple chatbots, but when your application requires strict business logic, branches, or approvals, you reach for LangGraph directly.

---

## 3. What LangGraph is NOT

To avoid architectural confusion:
- ❌ **Not a chatbot widget**: It is a general-purpose state machine runtime.
- ❌ **Not a replacement for LangChain**: They work together; LangChain provides model connectors and tools, while LangGraph coordinates execution.
- ❌ **Not only for AI**: A node in LangGraph can be a pure deterministic REST API call, an SQL query, or custom math with zero LLM involvement.
- ❌ **Not a model provider**: It orchestrates execution, still calling OpenAI, Anthropic, or local models.

---

## 4. Why Use LangGraph? The Ceiling of the Fixed ReAct Loop

In a standard agent loop (`createAgent`), execution is an open-ended conversation:

$$\text{User} \longrightarrow \text{Model} \longrightarrow \text{Tool?} \longrightarrow \text{Model} \longrightarrow \text{Tool?} \longrightarrow \text{Model} \longrightarrow \text{Answer}$$

This open loop fails when building production systems:
1. **Unpredictable Sequencing**: You cannot reliably force the model to execute Step 1 $\to$ Step 2 $\to$ Step 3 in order without skipping or hallucinating steps.
2. **Cannot Mix Deterministic Logic Cleanly**: Forcing an LLM to perform data transformation or API pagination wastes tokens and risks hallucinations. Pure code should do deterministic work; LLMs should do language work.
3. **No Resumability**: If a workflow takes 2 hours or waits for human approval, standard Node.js loops cannot be paused and serialized to a database.

### Standard Loop vs. Custom LangGraph Workflow

```
Standard Agent Loop (Uncontrolled):
User ──► LLM ──► Tool? ──► LLM ──► Tool? ──► LLM ──► Final Answer

Custom LangGraph Workflow (Controlled):
[START] 
   │
   ▼
[Scrape Webpage (Pure Code)]
   │
   ▼
[Extract Entities (LLM)]
   │
   ▼
{Quality Check > 80%?}
   ├─ YES ──► [Write to DB (Pure Code)] ──► [END]
   └─ NO  ──► [Human Review Gate (Pause)] ──► [Refine (LLM)] ──► {Quality Check}
```

---

## 5. The 5 Superpowers of LangGraph

### 1. Fine-Grained Deterministic Control
You decide the exact graph topology, determining which step runs when, which nodes run in parallel, and which nodes loop.

### 2. Native Combination of Code and AI
Nodes can be deterministic functions (API calls, regex, validations) or LLM calls. You only pay for LLM intelligence where semantic reasoning is actually required.

### 3. Dynamic Branching & Cycles
LangGraph natively supports cyclical graphs. An agent can draft an article, evaluate its quality, loop back to rewrite if the score is low, and exit only when quality criteria are met.

### 4. Durable Execution & Persistence
With checkpointers (`MemorySaver`, Postgres, Redis), LangGraph serializes state after every step. If your server restarts mid-run, execution resumes seamlessly from the last completed node.

### 5. First-Class Human-in-the-Loop (HITL)
Set breakpoints (`interruptBefore: ["deployToProduction"]`) to pause execution, inspect the proposed state, collect human approval, and resume.

---

## 6. Minimal Hello-World StateGraph

```typescript
import { StateSchema, MessagesValue, StateGraph, START, END } from "@langchain/langgraph";

// 1. Define the State
const State = new StateSchema({
  messages: MessagesValue,
});

// 2. Define a Node Function
const greetingNode = async (state: typeof State.State) => {
  return {
    messages: [{ role: "assistant", content: "Hello! I am orchestrated by LangGraph." }],
  };
};

// 3. Assemble and Compile the Graph
const app = new StateGraph(State)
  .addNode("greeter", greetingNode)
  .addEdge(START, "greeter")
  .addEdge("greeter", END)
  .compile();

// 4. Invoke
const result = await app.invoke({
  messages: [{ role: "user", content: "Hi!" }],
});

console.log(result.messages.at(-1)?.content);
// "Hello! I am orchestrated by LangGraph."
```

---

## Key Takeaways

- LangGraph is a low-level state-machine runtime for building complex, durable agent workflows.
- It models workflows as **State**, **Nodes**, and **Edges**.
- Replaces unconstrained while-loops with deterministic, auditable pipelines.
- Supports cycles, human-in-the-loop approvals, parallel execution, and state persistence.

