# Lecture 19 — Agent Memory Systems: Chapter Index

## Chapter Notes

| Chapter | Title | File | Summary |
|---------|-------|------|---------|
| 1 | Stateless LLM APIs & Context-Window Limitations | [01_Stateless_LLM_APIs_and_Context_Window_Limitations.md](01_Stateless_LLM_APIs_and_Context_Window_Limitations.md) | Why LLM APIs are stateless and the four core failure points of naive history management |
| 2 | Short-Term Memory (STM) & Sliding Windows | [02_Short_Term_Memory_and_Sliding_Windows.md](02_Short_Term_Memory_and_Sliding_Windows.md) | How sliding windows solve context growth while preserving conversational continuity |
| 3 | Long-Term Memory (LTM) Taxonomy & Fact Extraction | [03_Long_Term_Memory_Taxonomy_and_Fact_Extraction.md](03_Long_Term_Memory_Taxonomy_and_Fact_Extraction.md) | Semantic, episodic, and graph memory; LLM-based fact extraction pipelines |
| 4 | Dynamic Context Assembly (STM + LTM_RAG + Query) | [04_Dynamic_Context_Assembly_Stm_Ltm_Rag_Query.md](04_Dynamic_Context_Assembly_Stm_Ltm_Rag_Query.md) | How to combine STM, LTM, and query into a single LLM prompt within token budgets |
| 5 | Memory Eviction, Contradiction Resolution & Decay | [05_Memory_Eviction_Contradiction_Resolution_and_Decay.md](05_Memory_Eviction_Contradiction_Resolution_and_Decay.md) | Scoring memories, detecting duplicates, resolving contradictions, and managing memory decay |
| 6 | Claude-Style Memory Dreaming & Background Reflection | [06_Claude_Style_Memory_Dreaming_and_Background_Reflection.md](06_Claude_Style_Memory_Dreaming_and_Background_Reflection.md) | Background memory cleanup process using LLM-based reflection |
| 7 | Managed Memory (mem0) + Multi-tenancy, Privacy & Compliance | [07_Managed_Memory_mem0_Multi_Tenancy_Privacy_Compliance.md](07_Managed_Memory_mem0_Multi_Tenancy_Privacy_Compliance.md) | Using mem0 framework, user isolation, encryption, and data privacy |
| 8 | Production Memory System Architecture | [08_Production_Memory_System_Architecture.md](08_Production_Memory_System_Architecture.md) | Complete system design, scaling, monitoring, and operational best practices |

## Complete Notes

- **[Lecture_19_Complete_Notes.md](Lecture_19_Complete_Notes.md)** — Executive summary, cheat sheets, decision tables, misconceptions, glossary, and 20 self-check questions

## Code

- **[code/Basic Code](../code/Basic Code/)** — Basic implementation
- **[code/Production Code](../code/Production Code/)** — Production-ready implementation
- **[implementations guide](../code/Basic Code/implementations guide/)** — Chapter-wise code walkthroughs

## Assignment

- **[Assignment/task.md](../Assignment/task.md)** — Lecture assignment with deliverables and acceptance criteria