# Lecture 21 — MCP Core: Complete Consolidated Notes

> **Companion to the per-chapter notes in `notes/01_…` through `notes/08_…`.** This file is shorter than the chapters and links to them for depth. Use it for review, quick reference, and the self-check questions at the end. It is an improved consolidated summary, not a verbatim combine of the chapters.

---

## Executive Summary

**MCP (Model Context Protocol)** is an open, standard protocol through which AI applications connect to external tools and data. It solves the **integration problem**: without a standard, every AI application re-integrates every external capability (**N × M** integrations); with MCP, every application speaks one protocol and every capability provider exposes it once (**N + M**).

| Component | One-line job |
|---|---|
| **Host** | The AI application; owns UX, policy, consent, context, composition |
| **MCP Client** | Talks the protocol to exactly one server — discovery, invocation, resources, prompts |
| **MCP Server** | Provides capabilities (tools, resources, prompts); does the actual work |

The lecture's three non-negotiable boundaries:

1. **An MCP server does not need an LLM.** It is ordinary business logic behind a standard door.
2. **MCP does not replace tool calling.** Tool calling decides *which* capability; MCP decides *where it comes from and how to reach it*.
3. **MCP standardises communication, not safety.** Security and authorisation remain the host's and server's responsibility.

This lecture covers chapters 01–08 (see below). Lectures 22+ go deeper on Resources, Prompts, and the production gateway.

---

## The Eight Chapters at a Glance

| # | Chapter | Core idea |
|---|---------|-----------|
| 01 | The Integration Problem and Why Standards Win | Bespoke integrations scale as **N × M**; one protocol scales as **N + M**. |
| 02 | What MCP Is — Protocol, Server and the Standard Interface | MCP standardises *access*, not *capability*; a server needs no LLM. |
| 03 | MCP vs Tool Calling — Two Complementary Layers | Tool calling = selection (model); MCP = delivery (application/protocol). |
| 04 | Host, Client and Server — The Three Roles | The core triad; one client per server; transports stdio + Streamable HTTP. |
| 05 | The Tools Primitive — Executable Capability | Tool definitions (name, description, schema), discovery, invocation, errors; JSON-RPC 2.0, transports, tool overload and the MCP Gateway. |
| 06 | Resources and Prompts — Context and Reusable Instructions | Tools (do), Resources (know), Prompts (reuse); control model. |
| 07 | Discovery, Selection, Invocation & Lifecycle | End-to-end lifecycle; caching; context budget; diagnostics. |
| 08 | Security, Production and a Practical Architecture | Security stays with the host; threat model, OAuth resource servers, production concerns. |

**Lecture roadmap:** Chapters 06's Resources/Prompts get full depth in **Lecture 22**. Chapter 08's gateway architecture continues in Lecture 22 as well. This lecture's scope is first contact with all three primitives, centred on **Tools**.

---

## The Complete Flow in One Diagram

```mermaid
flowchart TD
    U["USER"] -->|"1"| H["MCP HOST<br/>owns UX, policy, consent"]

    subgraph HOST["Host"]
        LLM["LLM — chooses the tool<br/>(probabilistic)"]
        MC["MCP Client<br/>one per server<br/>(deterministic)"]
        H --- LLM
        H --- MC
    end

    subgraph SVR["MCP SERVER<br/>capability provider"]
        TOOLS["Tools: do"]
        RES["Resources: know"]
        PROMPTS["Prompts: reuse"]
    end

    MC -->|"2  tools/list (discover)"| SVR
    SVR -->|"3  tool definitions"| MC
    LLM -->|"4  tool request"| H
    H -->|"5  tools/call (invoke)"| MC
    MC -->|"6  execute"| SVR
    SVR -->|"7  result"| MC
    MC -->|"8  result"| H
    H -->|"9  tool result in context"| LLM
    LLM -->|"10 final answer"| U

    style HOST fill:#89b4fa,color:#1e1e2e
    style LLM fill:#cba6f7,color:#1e1e2e
    style MC fill:#94e2d5,color:#1e1e2e
    style SVR fill:#f9e2af,color:#1e1e2e

> **The baton passes exactly once:** after step 4 (the model's choice), everything is deterministic and testable. Everything before step 4 needs evaluation; everything after needs tests.

---

## Decision Tables

### Which primitive should I use?

| Question | Tool | Resource | Prompt |
|---|---|---|---|
| Is there an *operation*, or just *content*? | Operation | Content | Reusable instruction |
| Who decides when it is used? | The model | The application | The user |
| Does it need arguments? | Usually yes — that is what `inputSchema` is for | No — the URI *is* the argument | Yes — filled per invocation |
| Should it appear in the model's tool list? | Yes | No — it stays out of the context budget until needed | Yes — discoverable via `prompts/list` |
| Is it cacheable? | Rarely (side effects / freshness) | **Often** — a URI can be cached and re-read | Sometimes — depends on template |
| Can the user pick it explicitly? | Not usually | **Yes** — the host can show a file/resource picker | **Yes** — the user can select from a list |

### Choosing between them — practical rule

| Use a **Tool** when… | Use a **Resource** when… | Use a **Prompt** when… |
|---|---|---|
| The model must *decide* to fetch it | The application *already knows* it is relevant | The user wants to reuse an instruction |

---

## Cheat Sheet: Methods, Roles, Transports

### MCP Server Primitives

| Primitive | Intent | Driven by | Typical calls |
|---|---|---|---|
| **Tools** | *Do* something | The **model** | `tools/list`, `tools/call` |
| **Resources** | *Know* something | The **application** | `resources/list`, `resources/read` |
| **Prompts** | Reuse an instruction | The **user** | `prompts/list`, `prompts/get` |

### Transport Comparison

| Consideration | stdio | Streamable HTTP |
|---|---|---|
| Server location | Same machine | Anywhere / cloud |
| Who starts the server | The client (subprocess) | Independently |
| Multiple clients per server | No | Yes |
| Authentication | Local OS / process controls | OAuth 2.1 resource server |
| Best for | Local dev, desktop tools | Shared, hosted, networked capability |

### Host Responsibility Matrix

| Responsibility | Host | Client | Server | Model |
|---|---|---|---|---|
| Own the conversation history | ✔ | | | |
| Hold the user's credentials and consent | ✔ | | | |
| Decide which tools to show the model | ✔ | | | |
| Render the UI and confirmations | ✔ | | | |
| Choose a tool and arguments | | | | ✔ |
| Open and maintain a connection to one server | | ✔ | | |
| Negotiate protocol version and capabilities | ✔ | ✔ | ✔ | ✔ |
| Discover capabilities (`tools/list`) | | ✔ | | |
| Declare capabilities honestly | | | ✔ | |
| Encode and decode protocol messages | | ✔ | ✔ | |
| Validate arguments against `inputSchema` | | | ✔ | |
| Authorise the caller | ✔ | | ✔ | |
| Execute the business operation | | | ✔ | |
| Sanitise outputs before they reach the model | ✔ | | ✔ | |
| Time out and retry | ✔ | ✔ | | |

> **Note the two rows with shared ownership.** Authorisation and output sanitisation are deliberately redundant: the host is a policy layer, the server is a security boundary. Defence in depth is the design, not a mistake.

---

## Missing Topics Covered

This lecture introduces all three MCP primitives (Tools, Resources, Prompts) at a first-contact level. Deeper dives appear in later lectures:

| Topic | Where it's covered | Depth |
|---|---|---|
| Resource templates (`file:///{path}`) | Ch 06 §6.3 | Basic |
| Prompt argument substitution | Ch 06 §6.7 | Basic |
| MCP Gateway tool filtering | Ch 05 §5.15; Lec 22 | Intermediate |
| Stateless MCP (2026-07-28 revision) | Ch 04 §4.8; Lec 22 | Advanced |
| Corrective RAG (CRAG) | Beyond scope | N/A |
| Multi-tenancy security policies | Ch 08 §8.5 | Advanced |

---

## Misconceptions & Corrections

| Misconception | Correction |
|---|---|
| **"MCP replaces tool calling"** | No. Tool calling decides *which* capability; MCP delivers *where it comes from*. They are complementary. |
| **"MCP is just REST but new"** | No. REST exposes endpoints to programmers; MCP exposes capabilities to models. They compose, not replace. |
| **"An MCP server needs an LLM"** | No. The server is ordinary business logic. The LLM lives in the host. |
| **"Discovery means automatic approval"** | No. Discovery is an inventory; the host decides what may actually run. |
| **"More tools = more powerful agent"** | No. More tools = more context, more selection complexity, potentially worse tool selection. |
| **"MCP standardises safety"** | No. MCP standardises communication; safety remains with the host and server. |

---

## Glossary

| Term | Definition |
|---|---|
| **MCP** | Model Context Protocol — an open standard for AI applications to connect to external tools and data. |
| **MCP Server** | A program that exposes capabilities through MCP — needs no LLM, just business logic. |
| **MCP Client** | Software inside the host that speaks the protocol to exactly one server. |
| **Host** | The AI application; owns conversation, policy, consent, composition. |
| **Tool** | An executable capability described by name, description, and input schema. |
| **Resource** | Addressable context or data exposed by an MCP server, identified by a URI. |
| **Prompt** | A reusable instruction or workflow exposed by an MCP server. |
| **JSON-RPC 2.0** | The envelope format for all MCP messages. |
| **stdio** | A transport where the client spawns the server as a local child process; communicates over stdin/stdout. |
| **Streamable HTTP** | A single HTTP endpoint supporting POST (requests) and optional SSE streaming (responses/notifications). |
| **N × M** | Without a standard: N applications × M capabilities = N × M integrations. |
| **N + M** | With one protocol: N applications + M capabilities = N + M integrations. |
| **Input Schema** | JSON Schema that constrains the arguments a model must provide when calling a tool. |
| **Output Schema** | JSON Schema (2025-06-18+) that constrains the structured result a tool returns. |
| **Annotations** | Hints in a tool definition (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) that drive host policy. |
| **`isError: true`** | A result flag indicating the tool call ran but the operation failed; the message text becomes model context. |
| **Protocol revision** | MCP is versioned by date (e.g. `2026-07-28`). The revision changes negotiation but not the core concepts. |

---

## 20 Self-Check Questions

1. **What problem does MCP solve?** — The integration problem: N × M bespoke integrations vs. N + M with one protocol.
2. **What are the three MCP primitives?** — Tools, Resources, Prompts.
3. **Does an MCP server need an LLM?** — No. It is ordinary business logic.
4. **Where does the LLM live in the architecture?** — Inside the AI application, alongside the MCP Client.
5. **What is the difference between tool calling and MCP?** — Tool calling = which capability; MCP = where it comes from and how to reach it.
6. **What are the six questions every integration must answer?** — What exists, where are they, what inputs, how to call, what returns, how to authenticate.
7. **What does `tools/list` return?** — An array of tool definitions (name, description, inputSchema), optionally paginated.
8. **What is the `tools/call` contract?** — `{"name": "tool_name", "arguments": {…}}` inside a JSON-RPC 2.0 envelope.
9. **What are the two mechanisms for tool results?** — `content[]` (typed blocks) and `structuredContent` (optional, with `outputSchema`).
10. **What is the difference between `isError: true` and a protocol error?** — `isError` means the call ran and failed; a protocol error means the call never happened.
11. **What are `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`?** — Annotations that tell the host how carefully to treat a tool.
12. **When should you adopt MCP?** — When a second consumer appears, or when you are consuming capabilities you do not own.
13. **What are the two standard MCP transports?** — stdio (local) and Streamable HTTP (remote).
14. **What is the `1:1` rule in MCP architecture?** — Each host client has a 1:1 relationship with one server.
15. **What does the host sanitise tool results before sending to the model?** — To prevent prompt injection via tool output.
16. **What is capability negotiation?** — The process where the host and server agree on which optional features (capabilities) are active for a session.
17. **What is the stateless model (2026-07-28 revision)?** — No handshake; version and capabilities sent per-request in `_meta`; session IDs removed; `server/discover` mandatory.
18. **What is the MCP Gateway's role?** — Central policy layer: tool filtering, routing, authentication, authorization, rate limiting, observability.
19. **What is the difference between a tool and a resource?** — A tool is an operation the model decides to use; a resource is content the application decides to read.
20. **What must you never do with a server's tool list?** — Never trust a flat, unfiltered list of all tools blindly; the host must filter by trust tier and namespace.

---

## How to Use the Chapter Notes

- **For depth:** Read the per-chapter notes in `notes/01_…` through `notes/08_…`. Each chapter ends with a summary and self-check questions.
- **For review:** Use this consolidated file for quick reference — the executive summary, the eight-chapters-at-a-glance table, the cheat sheets, and the self-check questions.
- **For practice:** After reading a chapter, answer its self-check questions without looking at the answers. If you get stuck, revisit the relevant section.
- **For the combined view:** This file is the "big picture." The chapter notes are the "deep dive." Use both.

---

**Back to:** [Lecture 21 — Chapter Index](../README.md) · [Chapter 01](./01_The_Integration_Problem_and_Why_Standards_Win.md) · [Chapter 02](./02_What_MCP_Is_Protocol_Server_and_Standard_Interface.md) · [Chapter 03](./03_MCP_vs_Tool_Calling_Complementary_Layers.md) · [Chapter 04](./04_Host_Client_Server_Architecture.md) · [Chapter 05](./05_The_Tools_Primitive.md) · [Chapter 06](./06_Resources_and_Prompts.md) · [Chapter 07](./07_Discovery_Invocation_and_Lifecycle.md) · [Chapter 08](./08_Security_Production_and_Practical_Architecture.md)