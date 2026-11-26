/**
 * Lecture 32 — LangGraph orchestration in TypeScript / JavaScript.
 *
 * Demonstrates a stateful agent graph:
 *   - StateSchema (typed state with a reducer channel)
 *   - StateGraph, nodes, edges, START, END
 *   - compile() then invoke() / stream()
 *   - MemorySaver checkpointer + threadId for persistence
 *
 * Required env: OPENAI_API_KEY (only if nodes call a model; this example is pure JS)
 * Run:   npx tsx src/langgraph.ts
 *        (or: npm run langgraph)
 */

import { END, START, StateGraph, StateSchema, MemorySaver } from "@langchain/langgraph";
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

export async function runLangGraph() {
    await invokeExample();
    await streamExample();
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
