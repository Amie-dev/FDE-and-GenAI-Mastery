# 📝 Assignment — Lecture 11: Agent SDK from Scratch

Complete these tasks after reading the notes and building the Basic Code. Each task maps to a chapter. Answer in writing, then verify by running code where indicated.

---

## Part A — Chapter-wise Questions (short answer)

### Chapter 01 — Introduction to Agent SDK & Core Architecture

**A1.** What five components does an Agent SDK add on top of a raw LLM API? Name each and give one sentence of what it contributes.

**A2.** In your own words, why is state (message history) kept by the Agent runtime rather than by the LLM itself?

**A3.** Draw the data flow for a single `agent.run("What's 2+2?")` call through: user input → Builder → Agent → LLM → output. Where does `messageHistory` get read? Where does it get written?

**A4.** What is the difference between a raw LLM API call (`Request → LLM → Response`) and an Agent SDK call? Use the table dimension format from the notes (State, Tools, Loop, Instructions, Configuration, Observability, Loop Safety, Architecture, Multi-step Tasks).

---

## Part A (continued) — Chapters 02–04

### Chapter 02 — Builder Pattern & Agent Configuration

**A5.** Why is the Builder Pattern preferred over a big `new Agent(...)` constructor with 8 optional parameters? Give at least three concrete problems the Builder solves.

**A6.** In the `AgentBuilder.build()` method, what four fields are validated as required? What happens if any is missing?

**A7.** What does `toolMap` give you that a plain `toolList` array does not? Give the Big-O for lookup in both cases.

**A8.** Write the fluent builder chain to create an agent named `"coding-agent"` with system prompt `"You are a senior developer"`, a `WeatherTool`, a `CalculatorTool`, and `maxLoop = 10`. Show the TypeScript.

---

### Chapter 03 — Harness Prompting & ReAct Pipeline

**A9.** List the five stages of the Harness pipeline in order. For each stage, write one sentence of what happens.

**A10.** Does every Agent step require a tool call? Explain with an example of a query that goes `INITIAL → THINK → OUTPUT` without tools, and one that goes `INITIAL → THINK → TOOL_REQUEST → ANALYSE → THINK → OUTPUT` with tools.

**A11.** What does `MAX_LOOP` protect against? What value is used in the Basic Code server, and what happens when it is exceeded?

**A12.** In the Harness pipeline, what is the difference between `THINK` and `ANALYSE`? Why does the loop return to `THINK` after `ANALYSE` instead of ending?

---

### Chapter 04 — Tool Execution Engine & Registry

**A13.** What is the `ITool` interface contract? Name all three required members and their types.

**A14.** Who executes a tool: the LLM or the Agent runtime? Justify your answer using the notes.

**A15.** The LLM returns `{"step": "TOOL_REQUEST", "functionName": "searchGoogle", "input": "latest AI news"}` but `searchGoogle` is not registered. What does the Agent runtime do? Show the exact error `ToolResult` content that gets injected into history.

**A16.** Write a new `ITool` implementation called `EchoTool` that takes an `args.message` string and returns `{ content: `Echo: ${args.message}` }`. Show the full TypeScript class.

**A17.** What two kinds of errors can occur during tool execution, and how does `ToolRegistry.execute()` handle each differently?


---

## Part A (continued) — Chapters 05–08

### Chapter 05 — Message State Execution & Interceptor Middleware

**A18.** What four message roles are used in this SDK? Give one example of when each role appears.

**A19.** Why does `messageHistory` need to be sent to the LLM on every turn? Could the LLM remember previous turns without it?

**A20.** What does an `Interceptor` do? Write an interceptor function that logs every message to the console in the format `[ROLE] content` and never drops a message.

**A21.** If an interceptor returns `null` for a message, what happens to that message? When might you want this behaviour?

**A22.** What does `BasicLLMEngine.generate()` do in the Basic Code? Is it a real LLM call? Explain.

---

### Chapter 06 — Structured Output & Defensive Parsing

**A23.** Why is `JSON.parse()` alone not enough for parsing LLM output? Give two ways an LLM might wrap JSON that would break a direct parse.

**A24.** What is the difference between "defensive extraction" and "schema validation"? Which step recovers the object, and which enforces its shape?

**A25.** In the `HarnessPipeline.parseToolCalls()` method, what is returned if `JSON.parse(response)` throws? Why is this defensive?

**A26.** Write a Zod schema for a tool-call response object with fields `step` (string), `functionName` (string), and `input` (unknown). Show how you would use `schema.safeParse()` to validate a raw LLM response string.

---

### Chapter 07 — Guardrails, Safety & Production Hardening

**A27.** What are input guardrails used for? Name three things they can validate before execution.

**A28.** What are output guardrails used for? Name two things they can sanitise before returning to the user.

**A29.** The Basic Code uses `maxLoop = 5`. What production safety controls should be added beyond `MAX_LOOP`? List at least five from the notes.

**A30.** A tool such as `execCli` lets the model run arbitrary shell commands. Why is this high-risk in production? Name three mitigations.

---

### Chapter 08 — Multi-Agent Swarms, Handoffs & Provider Packaging

**A31.** What is a `Handoff` in a multi-agent swarm? When would you use one instead of a regular tool call?

**A32.** How does `AgentSwarm` run until completion? What two stopping conditions exist?

**A33.** Why keep provider logic behind an `LLMProvider` adapter interface? What happens if you want to switch from OpenAI to Gemini?

**A34.** What is the production packaging goal of this SDK? Name three things the published package should include.

---

## Part B — Hands-on Coding Tasks (runnable checks)

### B1 — Add a new tool without editing the core loop

Create a new `ITool` called `TimeTool` that returns the current ISO timestamp. Register it in the server alongside `WeatherTool` and `CalculatorTool`. Restart the server and verify via `curl` that the agent can use it.

**Check:** `curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{"message":"What time is it?"}'` returns a response containing a timestamp.

### B2 — Add an interceptor without editing the core loop

Add a logging interceptor to `MessageHistory` that prints every message role and content to the console. Run a chat request and verify the interceptor output appears in the server terminal.

**Check:** Server console shows `[user] Hello` and `[assistant] ...` lines during a `/chat` call.

### B3 — Verify MAX_LOOP safety

Set `maxLoop = 2` on the agent in `server/index.ts`. Send a message that would normally require multiple tool-calling turns. Verify the server returns `"Error: Max loop iterations reached"` instead of hanging forever.

**Check:** Server responds within a few seconds with the max-loop error message.

### B4 — Test tool-not-found recovery

Add a tool call request for an unregistered tool name (e.g. `"nonexistent_tool"`) by crafting a message that triggers the Harness pipeline's TOOL_REQUEST stage. Verify the error `ToolResult` is injected into history and the agent does not crash.

**Check:** Server returns a JSON response containing `"not found"` or continues without crashing.

### B5 — Build and run the compiled server

Run `npm run build` then `npm start`. Verify the compiled `dist/` server responds to `GET /health` and `POST /chat`.

**Check:** Both endpoints return HTTP 200 with valid JSON.


---

## Part C — Capstone Extension (choose one)

**C1.** Add a second provider adapter (e.g. a mock `GeminiLLMEngine` that implements `LLMEngine` but echoes with a different prefix). Swap it into the `AgentBuilder` and verify the agent still works.

**C2.** Add input guardrails: before `agent.run()` is called in the `/chat` route, scan the user message for blocked keywords (e.g. `"rm -rf"`, `"delete all"`) and return a 400 error if found.

**C3.** Add output guardrails: after `agent.run()` returns, scan the output for PII-like patterns (email addresses, phone numbers) and redact them before sending the response.

---

## Completion Gate

Before marking this lecture complete, confirm:

- [ ] All Part A questions answered in writing
- [ ] Part B tasks B1–B5 all pass with `curl` verification
- [ ] At least one Part C extension implemented
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] `GET /health` returns `{ "status": "ok" }`
- [ ] `POST /chat` returns `{ "response": "..." }`

