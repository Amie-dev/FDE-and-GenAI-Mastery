# Index — Lecture 11: Building an Agent SDK from Scratch

> **Phase:** 3 · Agency & Contracts · **Level:** 🟠 Advanced · **Source:** `GAC D08`

Chapter-by-chapter notes written from the `GAC D08` source material. For the
compact, all-in-one reference see
[`notes/Lecture_11_Complete_Notes.md`](./notes/Lecture_11_Complete_Notes.md).

| # | Chapter | Notes file | Tags |
|---|---------|-----------|------|
| 1 | Agent SDK Foundations: Stateless vs State, Triad | [`notes/01-introduction-to-agent-sdk-and-architecture.md`](./notes/01-introduction-to-agent-sdk-and-architecture.md) | architecture, triad, mental model |
| 2 | Builder Pattern & Configuration | [`notes/02-builder-pattern-and-agent-configuration.md`](./notes/02-builder-pattern-and-agent-configuration.md) | builder, config, validation |
| 3 | Harness Prompting & ReAct Pipeline | [`notes/03-harness-prompting-and-react-pipeline.md`](./notes/03-harness-prompting-and-react-pipeline.md) | harness, ReAct, state machine |
| 4 | Tool Execution Engine & Registry | [`notes/04-tool-execution-engine-and-registry.md`](./notes/04-tool-execution-engine-and-registry.md) | ITool, registry, execution |
| 5 | Message State, Execution & Interceptors | [`notes/05-message-state-execution-and-interceptors.md`](./notes/05-message-state-execution-and-interceptors.md) | messageHistory, interceptors, MAX_LOOP |
| 6 | Structured Output & Defensive Parsing | [`notes/06-structured-output-and-defensive-parsing.md`](./notes/06-structured-output-and-defensive-parsing.md) | JSON, schema, validation |
| 7 | Guardrails, Safety & Production Hardening | [`notes/07-guardrails-safety-and-production-hardening.md`](./notes/07-guardrails-safety-and-production-hardening.md) | safety, guardrails, observability |
| 8 | Multi-Agent Swarms, Providers & Packaging | [`notes/08-multi-agent-swarms-providers-packaging.md`](./notes/08-multi-agent-swarms-providers-packaging.md) | swarm, handoff, providers |

## Quick start

1. Read `notes/01…02` for the architecture and configuration model.
2. Read `notes/03…05` for the runtime pipeline (harness → tools → state).
3. Read `notes/06…07` for defensive output handling and safety.
4. Read `notes/08` for multi-agent composition and provider abstraction.
5. Skim `notes/Lecture_11_Complete_Notes.md` for an executive overview,
   cheat sheet, decision tables, misconceptions and glossary.

## Diagram index

| Concept | Where the diagram lives |
|---------|--------------------------|
| Agent SDK triad / core architecture | `notes/01-introduction-to-agent-sdk-and-architecture.md` |
| AgentBuilder pipeline (`toolList → toolMap`, `build()`) | `notes/02…` |
| Harness 5-stage pipeline (`INITIAL → … → OUTPUT`) | `notes/03…` |
| Tool dispatch flow (`toolMap.get` → executor → result) | `notes/04…` |
| MessageHistory lifecycle + interceptor hooks | `notes/05…` |
| Structured output contract + parse/recover loop | `notes/06…` |
| Guardrail placement (input vs output) | `notes/07…` |
| Multi-agent handoff + fan-out/fan-in swarm | `notes/08…` |

## Related

- **Roadmap**: [`../roadmap.md`](../roadmap.md) → *"Lecture 11 — Building an Agent SDK from Scratch"*
- **Complete notes**: [`notes/Lecture_11_Complete_Notes.md`](./notes/Lecture_11_Complete_Notes.md)
- **Assignment**: [`code/`](./code/) (code build target, pending)
