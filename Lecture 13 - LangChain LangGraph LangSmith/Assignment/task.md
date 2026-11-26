# Lecture 32 — Assignment / Completion Gate

## Goal

Build and run a TypeScript / JavaScript program that demonstrates the three LangChain ecosystem pillars covered in this lecture:

1. **LangChain provider delivery** — call a model through a single unified API (`initChatModel` with a provider prefix), and show that the same `invoke`/`stream` code works across providers.
2. **LangGraph orchestration** — build a typed stateful graph (`StateGraph` + `StateSchema`), compile it, and run it with `invoke` and `stream`.
3. **LangSmith observability** — enable tracing via environment variables and confirm a LangChain call is traced.

## Starter code

`code/src/providers.ts`, `code/src/langgraph.ts`, `code/src/langsmith.ts`, `code/src/index.ts`  
Dependencies are in `code/package.json` (mirrors the reference repo `@langchain/*` stack).

## Tasks

### Task 1 — Provider delivery (notes/01)
Run the providers demo and show:
- [ ] `initChatModel("openai:gpt-5.5")` returns a model with `.invoke()` and `.stream()`.
- [ ] The same `invoke()` call works when you switch the provider prefix (e.g. to `anthropic:…` or `google:…`) — no app-logic rewrite.
- [ ] Direct `ChatOpenAI` instantiation works with `model`, `apiKey`, and optional `configuration.baseURL`.

### Task 2 — LangGraph orchestration (notes/02)
Run the langgraph demo and show:
- [ ] A `StateGraph(State)` with a typed `StateSchema` (zod).
- [ ] At least one node + edges (`START` → node → `END`).
- [ ] `.compile()` is called before `.invoke()` / `.stream()`.
- [ ] `.invoke()` returns final state; `.stream()` yields per-super-step events.

### Task 3 — LangSmith tracing (notes/03)
- [ ] Copy `.env.example` to `.env` and fill in real keys (`OPENAI_API_KEY`, `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY`).
- [ ] Run the langsmith demo; the model call is traced automatically to LangSmith.
- [ ] Confirm the trace appears in the LangSmith UI under `LANGSMITH_PROJECT` (default: `default`).

### Task 4 — Combined runner (optional but recommended)
- [ ] `npm start` (runs `src/index.ts`) executes all three demos in sequence without errors.

## Completion gate

All of the following must be true:

- [ ] `npm install` succeeds inside `code/`.
- [ ] `npm run providers` runs and prints a model reply + streamed output.
- [ ] `npm run langgraph` runs and prints the final state + stream events.
- [ ] `npm run langsmith` runs and prints a model reply (requires LangSmith keys; tracing is best-effort without them).
- [ ] You can explain, in one sentence each: what a LangChain **provider package** does, what `compile()` does in LangGraph, and which env var enables LangSmith tracing.

## Deliverable

Push your completed `Lecture 32 - LangChain LangGraph LangSmith/` folder (notes + code) and be ready to walk through the output of each demo.
