# 02 — LangGraph orchestration in TypeScript / JavaScript

**Source:** [LangGraph.js — Graph API overview](https://docs.langchain.com/oss/javascript/langgraph/graph-api.md)

---

## What LangGraph is

LangGraph models agent workflows as **graphs of shared state, nodes, and edges**:

1. **State** — a shared snapshot of the application, usually a typed schema.
2. **Nodes** — functions that read state, do work, and return updates.
3. **Edges** — fixed or conditional transitions that determine the next node.

Nodes do the work; edges decide what runs next. `Send` dynamically invokes nodes for fan-out, and `Command` updates state while routing to the next node (including resume after an interrupt).

Execution advances in discrete **super-steps** (Pregel-style message passing): nodes that run in parallel share one super-step; nodes that run in sequence use separate super-steps.

---

## Smallest end-to-end example

```typescript
import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
    text: z.string(),
});

const graph = new StateGraph(State)
    .addNode("nodeA", (state) => ({ text: `${state.text}a` }))
    .addEdge(START, "nodeA")
    .addEdge("nodeA", END)
    .compile();

await graph.invoke({ text: "" });
// { text: 'a' }
```

You **must compile** the graph before invoking or streaming it. Compilation checks the graph structure (e.g. orphaned nodes) and is where you attach checkpointers and breakpoints.

---

## State

State is the shared data nodes read and update, stored in **channels** (named slots in the state schema). Each channel holds a value and defines how updates merge into it — most use last-write-wins; channels with a **reducer** combine values (e.g. append to a list).

Nodes return **partial updates**, which LangGraph merges through the channel's update rule.

---

## Compiling, invoking, streaming

```typescript
const graph = new StateGraph(State)
    .addNode("nodeA", nodeA)
    .addEdge(START, "nodeA")
    .addEdge("nodeA", END)
    .compile();                              // <-- required before invoke/stream

await graph.invoke({ input: "hi" });         // run once, wait for final result

for await (const event of await graph.stream({ input: "hi" })) {
    console.log(event);                      // stream events per super-step
}
```

---

## Runtime context

Pass dependencies (model name, DB handle) into nodes without putting them in graph state:

```typescript
import { END, START, StateGraph, StateSchema, GraphNode } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
    input: z.string(),
    output: z.string(),
});

const ContextSchema = z.object({
    llm: z.union([z.literal("openai"), z.literal("anthropic")]),
});

const nodeA: GraphNode<typeof State> = (state, config) => {
    const llm = config.context?.llm ?? "";
    return { output: llm };
};

const graph = new StateGraph(State, ContextSchema)
    .addNode("nodeA", nodeA)
    .addEdge(START, "nodeA")
    .addEdge("nodeA", END)
    .compile();

await graph.invoke({ input: "hi" }, { context: { llm: "anthropic" } });
```

---

## Recursion limit

Caps how many super-steps one run may execute; exceeding it raises `GraphRecursionError`. Default is **25 super-steps**. Pass `recursionLimit` as a top-level config key (not under `configurable`).

---

## Checkpoints & persistence

LangGraph supports **checkpointers** to persist state between runs, enabling:
- Resume after an interrupt (human-in-the-loop)
- Time-travel / replay
- Multi-turn conversation memory

Attach at compile time:

```typescript
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const graph = new StateGraph(State)
    .addNode("nodeA", nodeA)
    .addEdge(START, "nodeA")
    .addEdge("nodeA", END)
    .compile({ checkpointer });   // persist state
```

---

## Minimal runnable example (langgraph.ts)

A tiny "reflect" graph: a node appends to a list until a stop condition, using a reducer channel.

```typescript
import { END, START, StateGraph, StateSchema, MemorySaver } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
    text: z.string(),
    steps: z.array(z.string()),
});

const append = (state: { text: string; steps: string[] }) => ({
    text: `${state.text}x`,
    steps: [...state.steps, "step"],
});

const graph = new StateGraph(State)
    .addNode("append", append)
    .addEdge(START, "append")
    .addEdge("append", END)
    .compile({ checkpointer: new MemorySaver() });

const result = await graph.invoke({ text: "", steps: [] }, { configurable: { threadId: "t1" } });
console.log(result);
// { text: 'x', steps: [ 'step' ] }
```

---

## Key takeaways

- Build with `StateGraph(State)` → `.addNode()` → `.addEdge()` → `.compile()`.
- Run with `.invoke()` (once) or `.stream()` (per super-step).
- State is typed (zod) and stored in channels with merge/reducer rules.
- Use `MemorySaver` checkpointer for persistence, interrupts, and replay.
- Pass runtime deps via `config.context`, cap work with `recursionLimit`.
