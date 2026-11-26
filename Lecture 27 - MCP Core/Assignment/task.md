# Lecture 21 — MCP Core: Host, Client, Server & Tools — Assignment

> **Source:** `../roadmap.md` → "Lecture 21" → **Build** and **Gate**
> **Built against:** `code/Basic Code/` (Express · TypeScript · MCP SDK · Zod)

---

## 📋 Task Statement

Build and verify a minimal **MCP server** that exposes three capabilities — **Tools** (do), **Resources** (know), and **Prompts** (reuse) — plus a **client** that runs the full discovery → selection → invocation → failure → resources → prompts lifecycle. Every feature must match exactly what is in `notes/` for Lecture 21 chapters 01–08.

The core artefact is already built in `code/Basic Code/`. Your assignment is to verify it, extend it minimally, and answer the practice questions below.

---

## ✅ Deliverables Checklist

| # | Deliverable | Done |
|---|-------------|------|
| 1 | `.env` — `MCP_SERVER_NAME`, `MCP_SERVER_VERSION`, `MCP_TRANSPORT` | ☐ |
| 2 | `src/config/config.ts` — server identity + transport config | ☐ |
| 3 | `src/server/server.ts` — `createServer()` factory | ☐ |
| 4 | `src/tools/tools.ts` — `create_task`, `list_tasks`, `complete_task` | ☐ |
| 5 | `src/services/taskService.ts` — in-memory task store | ☐ |
| 6 | `src/resources/resources.ts` — `company://policies/*` resources | ☐ |
| 7 | `src/prompts/prompts.ts` — `review_pull_request` prompt | ☐ |
| 8 | `src/index.ts` — STDIO transport binding | ☐ |
| 9 | `src/client/client.ts` — 6-step lifecycle demo | ☐ |
| 10 | `npm run typecheck` passes | ☐ |
| 11 | `npm run client` runs all 6 lifecycle steps successfully | ☐ |

---

## 🎯 Practice Questions (chapter-wise)

### Chapter 01 — The Integration Problem

1. **N × M vs N + M**: Explain with concrete numbers why 5 applications × 3 tools = 15 bespoke integrations without MCP, but only 8 connections (5 + 3) with MCP.

2. **MCP boundaries**: The lecture lists three non-negotiable boundaries. Which one states that an MCP server needs **no LLM**? Why does that matter?

3. **Why standards win**: If you built 3 AI apps that each need a "weather" tool, how does MCP reduce your maintenance burden compared to integrating each app with the weather API directly?

---

### Chapter 02 — What MCP Is — Protocol, Server and Standard Interface

4. **Server identity**: What two fields does `serverInfo` expose, and where do they come from at runtime?

5. **No LLM needed**: Could the MCP server in `code/Basic Code/` run without any model? Explain why or why not using specific code files as evidence.

6. **Transport swap**: If you changed `MCP_TRANSPORT` from `stdio` to `streamable-http`, which single file would need its transport binding line changed? (Answer with the file path and line concept.)

---

### Chapter 03 — MCP vs Tool Calling — Two Complementary Layers

7. **Layer distinction**: What question does **tool calling** answer? What question does **MCP** answer? Give an example from the task code.

8. **The baton passes once**: In the 6-step client lifecycle (`src/client/client.ts`), which step is the only probabilistic one? Which steps are deterministic?

9. **Complementary example**: Give an example of a system that needs tool calling but **not** MCP. Give an example of a system that benefits from MCP even without tool calling.

---

### Chapter 04 — Host, Client and Server — The Three Roles

10. **Role mapping**: For each role (Host, MCP Client, MCP Server), name the exact file in `code/Basic Code/src/` that implements it.

11. **One client per server**: Can one `Client` instance talk to two MCP servers simultaneously? Why or why not?

12. **STDIO rule**: Why does `src/index.ts` write diagnostics to `console.error` instead of `console.log`? What would break if you wrote to stdout?

---

### Chapter 05 — The Tools Primitive — Executable Capability

13. **Tool contract**: What three things does a model see in a tool definition? Map each to the Zod/TypeScript code in `src/tools/tools.ts`.

14. **Output schema**: Why does `create_task` declare `outputSchema: taskSchema`? What would break if you removed it?

15. **Annotations vs policy**: The tool `create_task` sets `readOnlyHint: false`. Is that a guarantee the host must enforce? Explain.

16. **Tool execution error**: What is the difference between a JSON-RPC protocol error and `isError: true`? Which one appears as a normal `result`? Which is safe to retry?

17. **Recovery message**: Read the `complete_task` error message in `tools.ts`. Why does it tell the model to "Call list_tasks to read the exact titles, then retry"?

---

### Chapter 06 — Resources and Prompts — Context and Reusable Instructions

18. **Resource vs Tool**: A `return-policy` text is exposed as a **Resource**, not a Tool. Why? What protocol call reads it?

19. **Addressable context**: What URI scheme is used for resources in `resources.ts`? Why not `https://`?

20. **Prompt ownership**: Who drives a Prompt — the model, the application, or the user? Which protocol call fetches it?

21. **Prompt template**: Read `review_pull_request` in `prompts.ts`. What argument does it take, and how is that argument substituted into the returned message?

---

### Chapter 07 — Discovery, Selection, Invocation & Lifecycle

22. **Cached discovery**: Is `tools/list` required on every user message? If not, what invalidates the cache?

23. **Lifecycle order**: List the 6 lifecycle steps in order, marking each as probabilistic or deterministic.

24. **isError semantics**: The client calls `complete_task` with a non-existent title. The result has `isError: true`. Is that a protocol failure? Can the model recover from it?

25. **Resource drive**: The client calls `listResources()` then `readResource()`. Why is this **application-driven** rather than model-driven?

---

### Chapter 08 — Security, Production and Practical Architecture

26. **Security boundary**: Quote the governing security sentence of this lecture. Where does security live — host, client, or server?

27. **Environment config**: All server configuration reads from `.env`. Name three things that would be wrong if you hardcoded them instead.

28. **Annotations as hints**: List four tool annotations and explain why they are "hints, not guarantees."

29. **Progressive least privilege**: What is it, and why is it better than requesting all scopes up front?

30. **Transport + auth**: Which transport would you choose for a server shared by many users over the network, and what auth model does it require?

---

## 🎯 Acceptance Criteria

**The learner proves it works by:**

1. **Typecheck passes**:
   ```bash
   npm run typecheck
   ```

2. **Client lifecycle runs end to end**:
   ```bash
   npm run client
   ```
   Expected output: all 6 steps print — discovery (3 tools), selection (create_task), invocation (task created), failure (isError: true), resources (return-policy read), prompts (review_pull_request returned).

3. **Gate question** — answer without notes:
   > *"You can swap a STDIO server for an HTTP/SSE server without changing the host application. If you can explain how the host/client abstraction makes that swap possible, you're ready for Lecture 22."*

4. **Extended the server** (optional but recommended): Add one new tool of your own design (e.g., `delete_task`, `update_task_title`) following the exact same pattern as `create_task`, `list_tasks`, `complete_task` in `src/tools/tools.ts`. Register it, rebuild, and confirm it appears in `tools/list`.

---

## 📚 References

- **Notes:** `../notes/01_…` through `../notes/08_…`, plus `../notes/Lecture_21_Complete_Notes.md`
- **Roadmap Build/Gate:** `../roadmap.md` → "Lecture 21"
- **Implementation guide:** `../code/Basic Code/implementations guide/chapter-00.md` through `chapter-08.md`
