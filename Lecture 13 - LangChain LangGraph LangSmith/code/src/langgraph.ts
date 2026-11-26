/**
 * Lecture 13 — LangGraph orchestration in TypeScript / JavaScript.
 *
 * Demonstrates stateful & adaptive agent graphs:
 *   - StateSchema (typed state with a reducer channel)
 *   - StateGraph, nodes, edges, START, END
 *   - compile() then invoke() / stream()
 *   - MemorySaver checkpointer + threadId for persistence
 *   - Dynamic Send() fan-out / fan-in with ReducedValue (Chapter 16)
 *
 * Required env: OPENAI_API_KEY (only if nodes call a model; this example is pure JS)
 * Run:   npx tsx src/langgraph.ts
 *        (or: npm run langgraph)
 */

import { END, START, StateGraph, StateSchema, MemorySaver, ReducedValue, Send } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
    text: z.string(),
    // reducer channel: appends instead of last-write-wins
    steps: z.array(z.string()),
});

const appendNode = (state: { text: string; steps: string[] }) => ({
    text: `${state.text}x`,
    steps: [...state.steps, "step"],
});

const graph = new StateGraph(State)
    .addNode("append", appendNode)
    .addEdge(START, "append")
    .addEdge("append", END)
    .compile({ checkpointer: new MemorySaver() });

async function invokeExample() {
    console.log("--- invoke ---");
    const result = await graph.invoke(
        { text: "", steps: [] },
        { configurable: { thread_id: "thread-1" } },
    );
    console.log("Result:", JSON.stringify(result));
}

async function streamExample() {
    console.log("\n--- stream (per super-step) ---");
    for await (const event of await graph.stream(
        { text: "", steps: [] },
        { configurable: { thread_id: "thread-2" } },
    )) {
        console.log("Event:", JSON.stringify(event));
    }
}

const FanOutState = new StateSchema({
    topic: z.string(),
    subtasks: z.array(z.string()),
    // Fan-in channel: append partial arrays from N parallel Send() workers.
    results: new ReducedValue(
        z.array(z.string()).default(() => []),
        { reducer: (curr: string[], next: string[]) => curr.concat(next) },
    ),
    summary: z.string(),
});

const plannerNode = (state: { topic: string }) => ({
    subtasks: [
        `${state.topic}: architecture`,
        `${state.topic}: failure-modes`,
        `${state.topic}: cost-guardrails`,
    ],
});

const routeToWorkers = (state: { subtasks: string[] }) =>
    state.subtasks.map((task) => new Send("worker", { task }));

const workerNode = (state: { task: string }) => ({
    results: [`[done] ${state.task}`],
});

const aggregatorNode = (state: { results: string[] }) => ({
    summary: `Synthesized ${state.results.length} parallel branches: ${state.results.join(" | ")}`,
});

const fanOutGraph = new StateGraph(FanOutState)
    .addNode("planner", plannerNode)
    .addNode("worker", workerNode)
    .addNode("aggregator", aggregatorNode)
    .addEdge(START, "planner")
    .addConditionalEdges("planner", routeToWorkers, ["worker"])
    .addEdge("worker", "aggregator")
    .addEdge("aggregator", END)
    .compile();

async function sendFanOutExample() {
    console.log("\n--- dynamic Send() fan-out / fan-in ---");
    const result = await fanOutGraph.invoke({
        topic: "adaptive-agents",
        subtasks: [],
        results: [],
        summary: "",
    });
    console.log("Fan-out result:", JSON.stringify(result));
}

export async function runLangGraph() {
    await invokeExample();
    await streamExample();
    await sendFanOutExample();
}

// Standalone: `npx tsx src/langgraph.ts`  (also works with a relative path)
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const isMain = fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
    runLangGraph().catch((err) => {
        console.error("langgraph.ts error:", err);
        process.exit(1);
    });
}
