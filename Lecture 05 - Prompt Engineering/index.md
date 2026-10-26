# Lecture 05 — Prompt Engineering · Chapter Index

> **Phase:** 2 · Application Layer · **Level:** 🟢 Beginner · **Prerequisites:** Lecture 04
> **Goal:** Learn prompting as an engineering discipline — patterns, formats, failure modes and hygiene — not as
> magic phrases.
> **Gate:** you can convert a vague request into a versioned prompt with delimiters, an explicit output contract
> and a known failure mode.

---

## 📚 Chapters

| # | Chapter | One-line summary | File |
| :---: | :--- | :--- | :--- |
| 01 | **Prompt Engineering as an Engineering Discipline** | A prompt is an interface with five slots, a function signature and an output contract; GIGO governs everything, and the lever ladder tells you when to stop prompting. | [01_Prompt_Engineering_as_an_Engineering_Discipline.md](./notes/01_Prompt_Engineering_as_an_Engineering_Discipline.md) |
| 02 | **Zero-Shot Prompting** | Instruction + context + constraints with **no examples** — the baseline every other technique must beat, with a diagnosable failure taxonomy. | [02_Zero_Shot_Prompting.md](./notes/02_Zero_Shot_Prompting.md) |
| 03 | **Few-Shot Prompting & In-Context Learning** | Examples teach a pattern without changing weights; craft them by four rules — define the task, stay consistent, cover the classes, stay representative. | [03_Few_Shot_Prompting_and_In_Context_Learning.md](./notes/03_Few_Shot_Prompting_and_In_Context_Learning.md) |
| 04 | **Chain-of-Thought & Structured Reasoning** | Give the model output tokens to think with: zero-shot/few-shot CoT, the `INITIAL → THINK → ANALYZE → OUTPUT` pipeline — and the ten cases where CoT hurts. | [04_Chain_of_Thought_and_Structured_Reasoning.md](./notes/04_Chain_of_Thought_and_Structured_Reasoning.md) |
| 05 | **Role-Play & Persona Prompting** | A persona is a behavioural prior: seven fields plus a fallback, no new knowledge, and never a security boundary. | [05_Role_Play_and_Persona_Prompting.md](./notes/05_Role_Play_and_Persona_Prompting.md) |
| 06 | **Model-Specific Prompt Formats & Chat Templates** | A `messages` array never reaches the transformer — ChatML, Alpaca, `[INST]`, Llama-3 headers and FLAN-T5 are serialised by a chat template you own at the local-inference boundary. | [06_Model_Specific_Prompt_Formats_and_Chat_Templates.md](./notes/06_Model_Specific_Prompt_Formats_and_Chat_Templates.md) |
| 07 | **Prompt Hygiene, Delimiters & Output Contracts** | Separate rules from data (the LLM analogue of parameterised queries), delimit and escape it, order instructions deliberately, and state a machine-checkable output contract. | [07_Prompt_Hygiene_Delimiters_and_Output_Contracts.md](./notes/07_Prompt_Hygiene_Delimiters_and_Output_Contracts.md) |
| 08 | **Prompt Injection, Guardrails & Extraction Attacks** | Direct and indirect injection, goal hijacking, input/output/tool guardrails, moderation APIs in the right places, extraction vs distillation, and defence in depth. | [08_Prompt_Injection_Guardrails_and_Extraction_Attacks.md](./notes/08_Prompt_Injection_Guardrails_and_Extraction_Attacks.md) |
| 09 | **Prompt Versioning, Evaluation & the Prompt Registry** | Prompts are versioned artifacts: registry, semver, golden set, six metrics, CI regression gate, shadow → canary → A/B. | [09_Prompt_Versioning_Evaluation_and_the_Prompt_Registry.md](./notes/09_Prompt_Versioning_Evaluation_and_the_Prompt_Registry.md) |
| — | **Lecture 05 — Complete Notes** | Consolidated revision notes: executive summary, one diagram, cheat sheet, decision tables, 22 misconceptions, glossary and 20 self-check questions. | [Lecture_05_Complete_Notes.md](./notes/Lecture_05_Complete_Notes.md) |

**Chapter count: 9** (within the 5–10 limit for this lecture).

---

## 🧭 Reading paths

| Situation | Read |
| :--- | :--- |
| First pass, start to finish | 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 |
| Just want to write a better prompt today | [01](./notes/01_Prompt_Engineering_as_an_Engineering_Discipline.md) §01.2 · [07](./notes/07_Prompt_Hygiene_Delimiters_and_Output_Contracts.md) §07.7 |
| Preparing for an interview | [Lecture_05_Complete_Notes.md](./notes/Lecture_05_Complete_Notes.md) §1, §3, §5 |
| Debugging a broken prompt | [01](./notes/01_Prompt_Engineering_as_an_Engineering_Discipline.md) §01.7 · [06](./notes/06_Model_Specific_Prompt_Formats_and_Chat_Templates.md) §06.7 |
| Hardening a prompt | [07](./notes/07_Prompt_Hygiene_Delimiters_and_Output_Contracts.md) · [08](./notes/08_Prompt_Injection_Guardrails_and_Extraction_Attacks.md) |
| Proving a prompt change helped | [09](./notes/09_Prompt_Versioning_Evaluation_and_the_Prompt_Registry.md) §09.5–§09.8 |

---

## 🔗 Related workspace links

| Item | Link |
| :--- | :--- |
| Lecture workspace / checklist | [README.md](./README.md) |
| Generation prompt (git-ignored) | [prompt.md](./prompt.md) |
| Basic + Production code | [code/](./code) |
| Lecture assignment | [Assignment/task.md](./Assignment/task.md) |
| Roadmap — Lecture 05 topics, build & gate | [../roadmap.md](../roadmap.md) |

---

## 🔗 Source references

- `gen-ai-cohort/week01/learning/day02/notes/` — `row-class.md`, `prompting-notes/01 zero short prompting.md`,
  `prompting-notes/02 few short prompting.md`, `prompting-notes/03 COT.md`,
  `prompting-notes/04 role play prompting.md`, `02 llm-chat-roles.md`, `03 model-specific-formats.md`,
  `04 llm-security-and-guardrails.md`, `🚀 One-Line Summary of Day 02.md`
- `gen-ai-cohort/week01/learning/day02/persona/` — `amie.js`, `ria.js`, `tech_advisor.js` (the Day-02 persona work)
- `Forward-Deployed-Engineer/Lecture 03/notes/06_Framework_Abstractions_Response_Metadata_and_Prompt_Hygiene.md`
  (§6.3–6.5 — the concatenation flaw, prompt injection, multi-role architecture)

---

### Navigation

- **Previous lecture:** [Lecture 04 — LLM APIs and Multi-SDK](../Lecture%2004%20-%20LLM%20APIs%20and%20Multi-SDK/index.md)
- **Next lecture:** [Lecture 06 — Chatbots and Context](../Lecture%2006%20-%20Chatbots%20and%20Context/index.md)

