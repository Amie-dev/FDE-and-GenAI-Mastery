# 03 — LangSmith tracing & observability in TypeScript / JavaScript

**Source:** [LangSmith — Tracing quickstart](https://docs.langchain.com/langsmith/observability-quickstart) · [LangChain.js — Observability](https://docs.langchain.com/oss/javascript/langchain/observability)

---

## What LangSmith is

LangSmith is a platform for **capturing, debugging, evaluating, and monitoring agent behavior**. Traces record every step of an agent's execution — from the initial user input to the final response — including all tool calls, model interactions, and decision points.

When you build with LangChain or LangGraph, you can enable LangSmith tracing with **a single environment variable**.

---

## Prerequisites

1. A LangSmith account — sign up at [smith.langchain.com](https://smith.langchain.com).
2. A LangSmith API key — create one in LangSmith settings.
3. A model provider API key (e.g. OpenAI).

---

## Install

```bash
npm install langsmith
# or, as part of the LangChain stack:
npm install @langchain/core @langchain/langgraph @langchain/openai langchain
```

---

## Enable tracing (environment variables)

Set these in your shell before running the app:

```bash
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY="<your-langsmith-api-key>"
export LANGSMITH_PROJECT="my-project"   # optional; defaults to "default"
export OPENAI_API_KEY="<your-openai-api-key>"
```

> Older alias names you may still see: `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`.

For agent-based workspaces you may also set:

```bash
export LANGSMITH_AGENT_ID="<your-agent-id>"
export LANGSMITH_AGENT_ENVIRONMENT="local"
```

---

## Quickstart — no extra code needed

Once tracing is enabled, LangChain / LangGraph traces automatically:

```typescript
import { initChatModel } from "langchain/chat_models/universal";

const model = await initChatModel("openai:gpt-5.5");
const response = await model.invoke("What is LangChain?");
console.log(response.text);
// → the full call is traced to LangSmith
```

Traces appear in the LangSmith UI under your project. Each trace shows model calls, inputs/outputs, latency, token usage, and any tool calls.

---

## Selective tracing / manual instrumentation

To trace specific parts of your app, use the LangChain tracer:

```typescript
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

const tracer = new LangChainTracer();
// pass tracer into runs you want to instrument
```

You can also add metadata to traces and opt to trace only selected invocations.

---

## Minimal runnable example (langsmith.ts)

```typescript
import { initChatModel } from "langchain/chat_models/universal";

// Requires: LANGSMITH_TRACING=true, LANGSMITH_API_KEY, OPENAI_API_KEY
async function main() {
    const model = await initChatModel("openai:gpt-5.5");
    const response = await model.invoke("Explain observability in one sentence.");
    console.log(response.text);
    console.log("\n→ Trace sent to LangSmith project (see LANGSMITH_PROJECT).");
}

main().catch(console.error);
```

---

## Key takeaways

- Enable with `LANGSMITH_TRACING=true` + `LANGSMITH_API_KEY` (and optionally `LANGSMITH_PROJECT`).
- Tracing is automatic for LangChain and LangGraph runs — no code changes required.
- View traces in the LangSmith UI: model calls, latency, tokens, tool usage.
- Use `LangChainTracer` for selective/manual instrumentation.
- Needs a LangSmith account + API key from smith.langchain.com.
