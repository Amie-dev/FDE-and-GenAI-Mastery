# Lecture 21 — MCP Core — Chapter Index

> **Phase:** 6 · Integration · **Level:** 🟡 Intermediate · **Source:** FDE L14 · GAC D15

## Chapter Notes

| # | Chapter | File | One-line summary |
|---|---------|------|------------------|
| 01 | The Integration Problem and Why Standards Win | `notes/01_The_Integration_Problem_and_Why_Standards_Win.md` | Bespoke integrations scale as N × M; one protocol scales as N + M. |
| 02 | What MCP Is — Protocol, Server and the Standard Interface | `notes/02_What_MCP_Is_Protocol_Server_and_Standard_Interface.md` | MCP standardises *access*, not *capability*; a server needs no LLM. |
| 03 | MCP vs Tool Calling — Two Complementary Layers | `notes/03_MCP_vs_Tool_Calling_Complementary_Layers.md` | Tool calling decides *which* capability; MCP decides *where it comes from*. |
| 04 | Host, Client and Server — The Three Roles | `notes/04_Host_Client_Server_Architecture.md` | The core triad; one client per server; transports stdio + Streamable HTTP. |
| 05 | The Tools Primitive — Executable Capability | `notes/05_The_Tools_Primitive.md` | Tool definitions, discovery, invocation, errors, schema design rules. |
| 06 | Resources and Prompts — Context and Reusable Instructions | `notes/06_Resources_and_Prompts.md` | Tools (do), Resources (know), Prompts (reuse); control model; Resources vs RAG. |
| 07 | Discovery, Selection, Invocation & Lifecycle | `notes/07_Discovery_Invocation_and_Lifecycle.md` | End-to-end lifecycle; caching; context budget; diagnostics. |
| 08 | Security, Production and a Practical Architecture | `notes/08_Security_Production_and_Practical_Architecture.md` | Security stays with the host; threat model, OAuth resource servers, production. |

## Consolidated Notes

- [`notes/Lecture_21_Complete_Notes.md`](notes/Lecture_21_Complete_Notes.md) — executive summary, cheat sheet, decision tables, misconceptions, glossary, and 20 self-check questions.

## Related Files

- [`README.md`](../README.md) — lecture objectives, phase, level, checklist
- [`prompt.md`](../prompt.md) — generation prompt (git-ignored)
- [`code/`](../code/) — rebuilt codebase (Basic Code · Production Code + implementation guides) — not yet built for this lecture
- [`Assignment/task.md`](../Assignment/task.md) — lecture assignment
