/**
 * Lecture 13 — LangSmith tracing & observability in TypeScript / JavaScript.
 *
 * Demonstrates that LangChain / LangGraph traces are sent to LangSmith
 * automatically once tracing env vars are set.
 *
 * Required env:
 *   LANGSMITH_TRACING=true
 *   LANGSMITH_API_KEY=ls-...
 *   OPENAI_API_KEY=sk-...
 *   (optional) LANGSMITH_PROJECT=lecture-13
 *
 * Run:   npx tsx src/langsmith.ts
 *        (or: npm run langsmith)
 *
 * Then open the LangSmith UI (smith.langchain.com) and look under
 * the project named in LANGSMITH_PROJECT (default: "default").
 */

import { initChatModel } from "langchain/chat_models/universal";

export async function runLangSmith() {
    console.log("--- LangSmith automatic tracing ---");
    console.log("Make sure you exported before running:");
    console.log("  LANGSMITH_TRACING=true");
    console.log("  LANGSMITH_API_KEY=ls-...");
    console.log("  OPENAI_API_KEY=sk-...");
    console.log("  LANGSMITH_PROJECT=lecture-13\n");

    const model = await initChatModel("openai:gpt-5.5");
    const response = await model.invoke("Explain observability in one sentence.");
    console.log("Model reply:", response.text);
    console.log("\n→ This call was traced automatically to LangSmith.");
}

// Standalone: `npx tsx src/langsmith.ts`  (also works with a relative path)
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const isMain = fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
    runLangSmith().catch((err) => {
        console.error("langsmith.ts error:", err);
        process.exit(1);
    });
}
