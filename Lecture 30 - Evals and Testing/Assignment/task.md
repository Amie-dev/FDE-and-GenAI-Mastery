# Assignment — Lecture 30: Evals and Testing

> **Phase:** 9 · Quality & Safety · **Level:** 🟠 Advanced
> **Source:** FDE L17, L18

> Complete these after reading the notes in `notes/` and reviewing the code in `code/Basic Code/`. Each task maps to a chapter. Use the code as a reference implementation, then extend or verify it yourself.

## How to use

1. Read the chapter in `notes/0X_<topic>.md`.
2. Read the matching source file in `code/Basic Code/src/` (see the implementations guide for block-by-block explanations).
3. Attempt the task below for that chapter.
4. Check your work against the completion gate at the end.

---

## 1. Task Statement

You have learned why AI breaks deterministic `Expected == Actual` testing and how to build a repeatable eval: **Test Input → Expected Behaviour → Evaluator → Score**. Your hands-on task is to **read the lecture notes and run the provided deterministic eval API**, then complete the tasks below.

The build target of this lecture is:

> **Deterministic Eval Runner** — an Express + TypeScript API that takes test cases with expected facts/tool calls, runs them through a system under test, scores them with deterministic checks (string inclusion, JSON schema, tool call verification), and returns a per-case plus aggregate report.

You will work with the actual API built in `code/Basic Code/`, which contains:

- `src/types/index.ts` — `TestInput`, `ExpectedBehaviour`, `EvalCase`, `EvalResult`, `EvalReport`
- `src/services/evaluationService.ts` — `factInclusion`, `jsonSchemaCheck`, `toolCallCheck`, `runCase`, `runEval`
- `src/controllers/evalController.ts` — `POST /api/eval/run` handler
- `src/routes/index.ts` — route definitions (`/api/health`, `/api/eval/run`)
- `src/index.ts` — app entry point
- `implementations guide/` — chapter-wise explanations

---

## 2. Deliverable Checklist

Complete **all** of the following tasks and write your answers in a single file (e.g. `Assignment/answers.md`). If you write code, include it in the same file or in a companion file.

| Task | Type | Focus | Source |
|------|------|-------|--------|
| **A1** | Recall | Why `Expected == Actual` breaks for AI | Notes Ch 01 |
| **A2** | Recall | The four components of an eval | Notes Ch 02 |
| **A3** | Understand | Expected behaviour as properties, not exact strings | Notes Ch 02 |
| **A4** | Understand | Evaluation dataset vs golden dataset | Notes Ch 03 |
| **A5** | Apply | Define a test case (`TestInput` + `ExpectedBehaviour`) | Notes Ch 02–03 |
| **A6** | Apply | Run the API `POST /api/eval/run`; show pass and fail cases | Code `src/services/evaluationService.ts` |
| **A7** | Apply | Add a JSON schema check case (valid / invalid JSON) | Notes Ch 04 |
| **A8** | Apply | Add a tool-call verification case | Notes Ch 04 |
| **A9** | Analyze | Compute pass rate / aggregate from the report | Notes Ch 02 |
| **A10** | Critique | Deterministic checks (~80%) vs LLM judge / human (~20%) | Notes Ch 04 |

---

## 3. Acceptance Criteria (How to Prove It Works)

For each task, indicate your answer and, where relevant, show the evidence:

| Criterion | How to Prove It |
|-----------|-----------------|
| **A1** | 2–3 sentences: deterministic software vs non-deterministic AI |
| **A2** | List Test Input, Expected Behaviour, Evaluator, Score with one example each |
| **A3** | Write expected behaviour as checkable properties, not exact strings |
| **A4** | Explain the difference between eval dataset and golden dataset |
| **A5** | Provide a `TestCase` JSON object (`id`, `input`, `expected`) |
| **A6** | Paste `curl` output for a passing case and a failing case |
| **A7** | Show `jsonSchemaCheck` result for valid vs invalid JSON |
| **A8** | Show `toolCallCheck` result for correct vs wrong tool name |
| **A9** | Show aggregate: `totalCases`, `passedCases`, pass rate % |
| **A10** | Reasoned answer naming deterministic-checkable vs judge-needed properties |

---

## 4. Self-Check Questions (20)

Answer these in writing. They cover all chapters of the lecture.

### Chapter 01 — Why AI Needs Evals
1. Why does `assertEquals(5, add(2, 3))` work for software but fail for an LLM answer?
2. What is "Expected Output == Actual Output", and why does it break for AI?
3. What is the "scaling wall" (5 queries → 500 queries after every prompt change)?
4. Give an example of a silent regression (e.g. `topK 5 → 3`).

### Chapter 02 — Anatomy of an Eval
5. Name the four required components of every eval.
6. Why is "inputs but no expected behaviour" a smoke test, not an eval?
7. Why should test input capture the full assembled prompt, not just the user question?
8. Why express expected behaviour as properties rather than exact strings?
9. Name the three evaluator families (code / LLM judge / human).
10. What does an eval runner return per case and in aggregate?

### Chapter 03 — Evaluation Datasets and Golden Data
11. What is the difference between an evaluation dataset and a golden dataset?
12. What metadata enables slicing? (domain, difficulty, language, source, priority)
13. Why snapshot retrieved chunks and tool fixtures in a test case?
14. How do you version a dataset? (git tags, semantic versioning)

### Chapter 04 — Deterministic Evaluation
15. Name the four deterministic sub-types (string/regex, JSON schema, tool calls, latency/budget).
16. Why start with code checks before escalating to an LLM judge?
17. What does `factInclusion` check, and what is a false-positive risk?
18. What does `jsonSchemaCheck` verify?
19. What does `toolCallCheck` verify?
20. Which ~80% of regressions are deterministic; which ~20% need an LLM judge or human?

---

## 5. Stretch Goals (Optional – If You Finish Early)

1. **Add a latency/budget check** to `evaluationService.ts` (e.g. `time < 800ms`) and wire it into `runCase`.
2. **Replace the stub system** with a real RAG / model call and run an end-to-end eval.
3. **Add JSON schema validation** for a refund response shape `{ period, reason }`.
4. **Write a tiny CI script** that calls `POST /api/eval/run` and exits non-zero on any failure.

---

## 6. Completion Gate

You can move on to Lecture 31 when you can do all of the following:

- [ ] Define a test case with `TestInput` + `ExpectedBehaviour` matching the notes shapes.
- [ ] Run `POST /api/eval/run` and get both a passing and a failing report.
- [ ] Demonstrate `factInclusion`, `jsonSchemaCheck` and `toolCallCheck` each returning pass/fail.
- [ ] Read the aggregate report (`totalCases`, `passedCases`, `results`).
- [ ] Without notes, explain the four components of an eval and why code checks catch ~80% of regressions.

> **Gate evidence:** keep a `scratch/` folder (or your answers file) with your `curl` outputs. The roadmap gate for Lecture 30 is: *without notes, explain the four components of an eval and demonstrate a deterministic pass/fail using the code.*

---

## 7. References & Submission

- **Notes:** `FDE-and-GenAI-Mastery/Lecture 30 - Evals and Testing/notes/`
- **Code:** `FDE-and-GenAI-Mastery/Lecture 30 - Evals and Testing/code/Basic Code/`
- **Implementation Guide:** `FDE-and-GenAI-Mastery/Lecture 30 - Evals and Testing/code/Basic Code/implementations guide/`

Submit your answers with evidence (curl outputs, hand calculations, or code snippets).
