# Lecture 08 — Tool Calling · Chapter Index

> **Phase:** 3 · Agency & Contracts · **Level:** 🟡 Intermediate · **Prerequisites:** Lecture 07
> **Goal:** move from *"the model talks"* to *"the model acts"* — safely.
> **Gate:** you can show a 3-hop tool chain and point at the exact message that caused each hop.

---

## 📚 Chapters

| # | Chapter | One-line summary | File |
| :---: | :--- | :--- | :--- |
| 01 | **From Token Prediction to Tool Augmentation** | The model predicts tokens and never acts; BPE chunking destroys digit alignment, so arithmetic must be delegated; a tool is *capability + permission*. | [01_From_Token_Prediction_to_Tool_Augmentation.md](./notes/01_From_Token_Prediction_to_Tool_Augmentation.md) |
| 02 | **Tool Contracts: JSON Schema, OpenAPI & Parameter Typing** | A tool is a function wrapped in a contract — `name`, `description`, JSON Schema `parameters` — and that contract is the only thing the model knows; `description` is the routing index. | [02_Tool_Contracts_JSON_Schema_and_OpenAPI.md](./notes/02_Tool_Contracts_JSON_Schema_and_OpenAPI.md) |
| 03 | **The 5-Step Wire Protocol & Double-Turn Tool Calling** | A stateless HTTP ping-pong: definitions out → `tool_calls` proposal → local execution → addressed `tool` result → synthesis; a proposal turn plus a result turn. | [03_The_Five_Step_Wire_Protocol_and_Double_Turn_Calling.md](./notes/03_The_Five_Step_Wire_Protocol_and_Double_Turn_Calling.md) |
| 04 | **Tool Taxonomy: Deterministic, Informative & Action Tools** | Compute, information and action tools differ in idempotency, caching, retries, failure cost and permission tier — and results must be designed for the model's context. | [04_Tool_Taxonomy_Deterministic_and_Live_Information_Tools.md](./notes/04_Tool_Taxonomy_Deterministic_and_Live_Information_Tools.md) |
| 05 | **Multi-Step Chaining & the ReAct Execution Loop** | The model builds the dependency graph from observations (Thought → Action → Observation); every loop needs step, time, token, repetition and no-progress brakes plus a causal trace. | [05_Multi_Step_Chaining_and_the_ReAct_Execution_Loop.md](./notes/05_Multi_Step_Chaining_and_the_ReAct_Execution_Loop.md) |
| 06 | **Error Handling, Self-Healing & Result Re-injection** | A tool failure is a *result*, not an exception; six error classes, a structured error contract, two-stage argument defence and three levels of self-healing. | [06_Error_Handling_Self_Healing_and_Result_Reinjection.md](./notes/06_Error_Handling_Self_Healing_and_Result_Reinjection.md) |
| 07 | **Routing, `tool_choice` & Testing Tool Selection** | Selection is a semantic match you can measure: four `tool_choice` policies, six routing failure modes, fixtures, four metrics and a confusion matrix. | [07_Routing_Tool_Choice_and_Testing_Tool_Selection.md](./notes/07_Routing_Tool_Choice_and_Testing_Tool_Selection.md) |
| 08 | **Security, Permissions & the Token Economy** | The application is the kernel: three permission tiers, seven threats, six defence layers, an approval gate as a tool result, and $O(N^2)$ loop cost. | [08_Security_Permissions_and_the_Token_Economy.md](./notes/08_Security_Permissions_and_the_Token_Economy.md) |
| — | **Lecture 08 — Complete Notes** | Consolidated revision layer: executive summary, master diagram, cheat sheet, decision tables, 20 misconceptions, glossary, 20 self-check questions. | [Lecture_08_Complete_Notes.md](./notes/Lecture_08_Complete_Notes.md) |

**Chapter count: 8** (within the 5–10 limit for this lecture).

---

## 🧭 Reading paths

| Situation | Read |
| :--- | :--- |
| First pass, start to finish | 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 |
| "Why does my agent need tools at all?" | [01](./notes/01_From_Token_Prediction_to_Tool_Augmentation.md) §01.2–§01.7 |
| "The tool is never called / the wrong tool is called" | [02](./notes/02_Tool_Contracts_JSON_Schema_and_OpenAPI.md) §02.3 · [07](./notes/07_Routing_Tool_Choice_and_Testing_Tool_Selection.md) §07.3 |
| "The provider returns 400 on tool calls" | [03](./notes/03_The_Five_Step_Wire_Protocol_and_Double_Turn_Calling.md) §03.4 |
| "The agent hangs or costs too much" | [05](./notes/05_Multi_Step_Chaining_and_the_ReAct_Execution_Loop.md) §05.7 · [08](./notes/08_Security_Permissions_and_the_Token_Economy.md) §08.6 |
| "It crashed on a weird input" | [06](./notes/06_Error_Handling_Self_Healing_and_Result_Reinjection.md) §06.2, §06.5 |
| "It claims it did something it didn't" | [06](./notes/06_Error_Handling_Self_Healing_and_Result_Reinjection.md) §06.8 · [08](./notes/08_Security_Permissions_and_the_Token_Economy.md) §08.2 |
| "Is this safe to ship?" | [08](./notes/08_Security_Permissions_and_the_Token_Economy.md) §08.3, §08.4, §08.8 |
| Building the CLI agent (the lecture's build) | [02](./notes/02_Tool_Contracts_JSON_Schema_and_OpenAPI.md) → [04](./notes/04_Tool_Taxonomy_Deterministic_and_Live_Information_Tools.md) → [05](./notes/05_Multi_Step_Chaining_and_the_ReAct_Execution_Loop.md) → [06](./notes/06_Error_Handling_Self_Healing_and_Result_Reinjection.md) → [07](./notes/07_Routing_Tool_Choice_and_Testing_Tool_Selection.md) |
| Preparing for an interview | [Lecture_08_Complete_Notes.md](./notes/Lecture_08_Complete_Notes.md) §1, §3, §5, §7 |

---

## 🔗 Related workspace links

| Item | Link | Status |
| :--- | :--- | :---: |
| Lecture workspace / checklist | [📄 README.md](./README.md) | ✅ |
| Generation prompt (git-ignored) | [📄 prompt.md](./prompt.md) | ✅ |
| Chapter notes | [📂 notes/](./notes/) | ✅ 8 chapters + complete notes |
| Basic Code | [📂 code/](./code/) | ✅ 12 files + 10-chapter guide |
| Production Code | [📂 code/](./code/) | 🔜 to build |
| Lecture assignment | [📝 Assignment/task.md](./Assignment/task.md) | 🔜 to write |
| Roadmap — Lecture 08 topics, build & gate | [🗺️ ../roadmap.md](../roadmap.md) | ✅ |
| Repository chapter index (all lectures) | [📚 ../index.md](../index.md) | ✅ |

---

## 🔗 Source references

- `Forward-Deployed-Engineer/Lecture 05/notes/01_From_Token_Prediction_to_Tool_Augmentation.md`
- `Forward-Deployed-Engineer/Lecture 05/notes/02_The_Tool_Calling_Protocol_and_Wire_Architecture.md`
- `Forward-Deployed-Engineer/Lecture 05/notes/03_Multi_Step_Tool_Chaining_and_Execution_Loops.md`
- `gen-ai-cohort/week02/learning/day03/notes/04-structured-output-and-function-calling.md`
  (structured output · Zod · function calling · LangChain · AI slop · model collapse)

---

### Navigation

- **Previous lecture:** [Lecture 07 — AI Streaming](../Lecture%2007%20-%20AI%20Streaming/index.md)
- **Next lecture:** [Lecture 09 — AI Agents and HITL](../Lecture%2009%20-%20AI%20Agents%20and%20HITL/index.md)


