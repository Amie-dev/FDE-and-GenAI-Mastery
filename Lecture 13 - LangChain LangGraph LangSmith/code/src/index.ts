/**
 * Lecture 32 — combined runner.
 *
 * Runs all three demos in sequence:
 *   1. providers.ts   — LangChain provider delivery (initChatModel / ChatOpenAI)
 *   2. langgraph.ts   — LangGraph stateful graph (StateGraph / compile / invoke / stream)
 *   3. langsmith.ts   — LangSmith automatic tracing
 *
 * Required env: OPENAI_API_KEY, LANGSMITH_TRACING=true, LANGSMITH_API_KEY
 * Run:   npx tsx src/index.ts
 *        (or: npm start)
 */

import { runProviders } from "./providers";
import { runLangGraph } from "./langgraph";
import { runLangSmith } from "./langsmith";

(async () => {
    console.log("========== Lecture 32 — LangChain · LangGraph · LangSmith ==========");
    await runProviders();
    await runLangGraph();
    await runLangSmith();
    console.log("\n========== All demos complete ==========");
})().catch((err) => {
    console.error("index.ts error:", err);
    process.exit(1);
});
