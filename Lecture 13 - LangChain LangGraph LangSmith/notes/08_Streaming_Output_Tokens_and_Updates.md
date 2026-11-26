# Chapter 08 — Streaming Output: Tokens, Updates & Events

> **Reference:** `langchain_langgraph-main/notes/chapter-11.md` · `src/index.js` · [LangChain Streaming Docs](https://docs.langchain.com/oss/javascript/langchain/streaming)

---

## 1. Why Streaming is Essential

In production applications, foundation models and multi-step agents can take several seconds to generate complete responses. 

Without streaming:
- The user stares at a blank screen or loading spinner for 10–15 seconds.
- High drop-off rates and perceived slowness.
- Inability to abort early if the model goes off-track.

With streaming:
- First token arrives in 300–500ms (Time-to-First-Token, TTFT).
- Real-time feedback showing which tools the agent is executing.
- Fluid, modern conversational UI.

From the official [LangChain documentation](https://docs.langchain.com/oss/javascript/langchain/streaming):

> *"Streaming is crucial for enhancing the responsiveness of applications built on LLMs. By displaying output progressively as it's generated, users see immediate progress rather than waiting for the entire computation to finish."*

---

## 2. What Can You Stream?

LangChain provides three distinct streaming modes:

| Mode | What It Yields | Ideal Use Case |
| :--- | :--- | :--- |
| **`messages`** | Individual LLM tokens as they are sampled. | Chat interfaces with typing animations; terminal output. |
| **`updates`** | State updates emitted after each node / tool completes. | Status indicators (`"Agent executed web_search..."`), step-by-step progress bars. |
| **`custom`** | User-defined signals emitted from inside custom nodes. | Custom enterprise telemetry, progress percentages. |

---

## 3. Streaming Modes in Action

### Mode A: Token-by-Token Streaming (`streamMode: "messages"`)

This is the standard mode for chat interfaces. It streams token chunks directly from the underlying LLM:

```typescript
import "dotenv/config";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { webSearch, visitPage } from "./tools/index.js";

// Note: Enable streaming: true on the model instance
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  streaming: true,
  temperature: 0,
});

const agent = createAgent({
  model,
  tools: [webSearch, visitPage],
  systemPrompt: "You are a concise assistant. Use tools when needed.",
});

const resultStream = await agent.stream(
  { messages: [{ role: "user", content: "Summarize the history of TypeScript in 3 sentences." }] },
  { streamMode: "messages" }
);

process.stdout.write("Agent: ");

// Consume the async iterator
for await (const [token] of resultStream) {
  // Filter for AI generated tokens only (ignoring internal tool structures)
  if (token.type === "ai" && typeof token.content === "string") {
    process.stdout.write(token.content);
  }
}

console.log("\n");
```

---

### Mode B: Step-by-Step State Streaming (`streamMode: "updates"`)

If your agent calls multiple tools, `streamMode: "updates"` emits an event every time an agent step completes:

```typescript
const updateStream = await agent.stream(
  { messages: [{ role: "user", content: "Search for Bun 1.2 release notes" }] },
  { streamMode: "updates" }
);

for await (const update of updateStream) {
  // update contains the state diff for the step
  if (update.tools) {
    console.log("🛠️ Tool Finished Execution:", update.tools.messages[0].content.slice(0, 80) + "...");
  } else if (update.agent) {
    console.log("🤖 Agent Step Completed");
  }
}
```

---

## 4. Fine-Grained Telemetry: `streamEvents()`

For enterprise frontends needing complete visibility into the lifecycle (e.g., distinguishing between when a tool starts, when a tool finishes, and when the LLM generates tokens), LangChain provides `streamEvents()`:

```typescript
const eventStream = agent.streamEvents(
  { messages: [{ role: "user", content: "Check current AI news." }] },
  { version: "v2" }
);

for await (const event of eventStream) {
  const eventType = event.event;

  if (eventType === "on_chat_model_start") {
    console.log("🧠 LLM began reasoning...");
  } else if (eventType === "on_tool_start") {
    console.log(`🔧 Tool started: ${event.name} with args:`, event.data.input);
  } else if (eventType === "on_tool_end") {
    console.log(`✅ Tool ${event.name} finished.`);
  } else if (eventType === "on_chat_model_stream") {
    process.stdout.write(event.data.chunk.content ?? "");
  }
}
```

---

## 5. Streaming with Persistent Memory (`thread_id`)

Streaming works seamlessly with checkpointers. Simply pass `configurable.thread_id` in the options:

```typescript
import { MemorySaver } from "@langchain/langgraph";

const agentWithMemory = createAgent({
  model: new ChatOpenAI({ model: "gpt-4o-mini", streaming: true }),
  tools: [webSearch],
  checkpointer: new MemorySaver(),
});

const config = {
  configurable: { thread_id: "user_session_42" },
  streamMode: "messages" as const,
};

// Turn 1: Stream response
const stream1 = await agentWithMemory.stream(
  { messages: [{ role: "user", content: "My name is Alice." }] },
  config
);
for await (const [token] of stream1) {
  process.stdout.write(token.content ?? "");
}

// Turn 2: State is preserved across streams
const stream2 = await agentWithMemory.stream(
  { messages: [{ role: "user", content: "What is my name?" }] },
  config
);
for await (const [token] of stream2) {
  process.stdout.write(token.content ?? "");
}
```

---

## Key Takeaways

- Use `.stream()` or `.streamEvents()` instead of `.invoke()` for responsive real-time applications.
- `streamMode: "messages"` streams token-by-token output directly to the UI.
- `streamMode: "updates"` streams step-by-step progress as each tool or node completes.
- Ensure the model instance is configured with `streaming: true`.
- Checkpointer persistence (`thread_id`) works identically in streaming mode.

