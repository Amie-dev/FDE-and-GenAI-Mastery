/**
 * Lecture 13 — LangChain provider delivery in TypeScript / JavaScript.
 *
 * Demonstrates the "one API for any model" provider model:
 *   - initChatModel with provider prefix ("openai:gpt-5.5")
 *   - direct class instantiation (ChatOpenAI)
 *   - invoke + streaming
 *
 * Required env: OPENAI_API_KEY
 * Run:   npx tsx src/providers.ts
 *        (or: npm run providers)
 */

import { initChatModel } from "langchain/chat_models/universal";
import { ChatOpenAI } from "@langchain/openai";

async function initChatModelExample() {
    console.log("--- initChatModel (provider prefix) ---");

    // Portable across providers: same invoke() code for OpenAI / Anthropic / Google.
    const model = await initChatModel("openai:gpt-5.5");

    const reply = await model.invoke("What is LangChain in one sentence?");
    console.log("Reply:", reply.text);

    // Streaming — token by token.
    console.log("\nStream:");
    for await (const chunk of await model.stream("Count to three.")) {
        process.stdout.write(chunk.text ?? "");
    }
    console.log("\n");
}

async function directClassExample() {
    console.log("--- Direct class instantiation (ChatOpenAI) ---");

    const model = new ChatOpenAI({
        model: "gpt-5.5",
        // configuration: { baseURL: "https://your-provider.com/v1" }, // OpenAI-compatible endpoint
    });

    const reply = await model.invoke("Say hello in one word.");
    console.log("Reply:", reply.text);
}

export async function runProviders() {
    await initChatModelExample();
    await directClassExample();
}

// Standalone: `npx tsx src/providers.ts`  (also works with a relative path)
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const isMain = fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
    runProviders().catch((err) => {
        console.error("providers.ts error:", err);
        process.exit(1);
    });
}
