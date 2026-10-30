# Lecture 22 — Chapter Index

## Chapter notes

| # | Chapter | File | One-line summary |
|---|---|---|---|
| 01 | The Three Primitives and the Control Model | [notes/01_The_Three_Primitives_and_the_Control_Model.md](notes/01_The_Three_Primitives_and_the_Control_Model.md) | Tools, Resources, and Prompts differ by **who holds the trigger**: model, application, or user. |
| 02 | Why Resources, Context as a First-Class Primitive | [notes/02_Why_Resources_Context_as_a_First_Class_Primitive.md](notes/02_Why_Resources_Context_as_a_First_Class_Primitive.md) | Resources give the application a *nouns* primitive — read-only context the model never chooses. |
| 03 | Resource Discovery, Reading, and Anatomy | [notes/03_Resource_Discovery_Reading_and_Anatomy.md](notes/03_Resource_Discovery_Reading_and_Anatomy.md) | `resources/list` is discovery; `resources/read` is consumption; the same URI can return many content blocks. |
| 04 | Building Resources: Static, Dynamic, and Templated | [notes/04_Building_Resources_Static_Dynamic_and_Templated.md](notes/04_Building_Resources_Static_Dynamic_and_Templated.md) | One `registerResource` call per shape; templated Resources use `{param}` in the URI. |
| 05 | How the Application Chooses a Resource | [notes/05_How_the_Application_Chooses_a_Resource.md](notes/05_How_the_Application_Chooses_a_Resource.md) | The application picks context with rules → retrieval → state → user override, then reads the top 3. |
| 06 | MCP Prompts: Reusable Interaction Templates | [notes/06_MCP_Prompts_Reusable_Interaction_Templates.md](notes/06_MCP_Prompts_Reusable_Interaction_Templates.md) | A Prompt is a message template, not an answer; the user chooses when to invoke it. |
| 07 | Prompt Arguments, Discovery, and Client Wiring | [notes/07_Prompt_Arguments_Discovery_and_Client_Wiring.md](notes/07_Prompt_Arguments_Discovery_and_Client_Wiring.md) | `argsSchema` + `prompts/get`; the model call happens *after* the MCP call, in a separate line of code. |
| 08 | Bringing Tools, Resources, and Prompts Together | [notes/08_Bringing_Tools_Resources_and_Prompts_Together.md](notes/08_Bringing_Tools_Resources_and_Prompts_Together.md) | One request, three owners: user chooses Prompt → application reads Resources → model calls Tools. |
| 09 | MCP Gateway, Context Poisoning, and Security | [notes/09_MCP_Gateway_Context_Poisoning_and_Security.md](notes/09_MCP_Gateway_Context_Poisoning_and_Security.md) | The gateway is a detail, not a rewrite; bind to localhost, disable `X-Powered-By`, and validate origin. |

## Consolidated notes

- [Lecture_22_Complete_Notes.md](notes/Lecture_22_Complete_Notes.md) — combined reference across all chapters.

## Code

| Variant | Directory | Guide |
|---|---|---|
| Basic Code | [code/Basic Code/](code/Basic%20Code/) | [code/Basic Code/README.md](code/Basic%20code/README.md) |
| Production Code | [code/Production Code/](code/Production%20Code/) | [code/Production Code/README.md](code/Production%20code/README.md) |

## Assignment

- [Assignment/task.md](Assignment/task.md)