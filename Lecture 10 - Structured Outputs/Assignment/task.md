# Lecture 10 — Structured Outputs

## Assignment

This assignment consists of **practice questions** and **implementation tasks** that reinforce the concepts from the chapter notes and the code in both the `Basic Code` and `Production Code` folders. Attempt these after reading the notes and reviewing the source code.

---

### Part 1 — Basic Code Foundations

1. **One declaration, three artefacts** (`Chapter 06 §06.2–§06.3`):
   - In `src/schema/meeting.schema.ts`, the `MeetingSchema` Zod schema is declared once. Name the three artefacts that are derived from it and explain what each one contains.

2. **Enforcement ladder ordering** (`Chapter 06 §06.4`):
   - The Basic Code uses a 3-rung ladder: `native_schema > json_mode > instruction`. For each rung, describe the mechanism used, the failure mode that triggers moving to the next rung, and one concrete example of a model output that would be accepted at one rung but rejected at the next.

3. **Repair loop mechanics** (`Chapter 06 §06.5`):
   - The stub provider (attempt 1) deliberately emits a wrong type + enum drift. Describe the exact repair prompt format used and why the loop stops after `maxRepairs` attempts.

4. **Boundaries and fallbacks** (`Chapter 06 §06.6–§06.7`):
   - Explain the "boundary rule" that prevents raw model text from leaking into the HTTP response. What happens in the final fallback (attempts exhausted) — what shape does the degraded object take?

5. **Metrics** (`Chapter 06 §06.8`):
   - List all 6 metrics emitted per call (as verified in the smoke test). For each, explain what it measures and why it matters for production observability.

---
### Part 2 — Production Code Extensions

6. **Capability registry** (`Chapter 09 §09.5.1`):
   - In `src/providers/provider.types.ts`, the `MODEL_CAPABILITIES` type maps model names to a `downgraded` flag. Explain how this is used in the provider port (`src/providers/openai.provider.ts`) to decide whether to enable `tool_use` or fall back to `json_mode`.

7. **Four-rung ladder with `tool_use`** (`Chapter 09 §09.5.1`):
   - Beyond the Basic Code's 3-rung ladder, Production Code adds a 4th rung: `tool_use`. Describe the condition that promotes a model from rung 3 to rung 4, and the condition that demotes it back (the `downgraded` flag).

8. **Provider port + OpenAI-compatible adapter** (`Chapter 09 §09.5.2`):
   - `src/providers/openai.provider.ts` adapts a generic `Provider` to the OpenAI-compatible API. Identify three adapter concerns that are NOT about the HTTP contract (hint: timeout, backoff+jitter, circuit breaker).

9. **Tenant-scoped LRU cache** (`Chapter 09 §09.5.3`):
   - The cache key is `(tenant, text, model, schemaVersion)`. In `src/services/cache.service.ts`, describe how a cache hit avoids a full provider call and how the TTL prevents stale data.

10. **Semantic rule registry** (`Chapter 09 §09.5.4`):
    - `src/lib/rules.ts` (or equivalent) maintains a registry of semantic rules with IDs and severities. Explain how these rules are evaluated in the pipeline and how they feed into the `collectedIssues` array.

11. **Prometheus exposition** (`Chapter 09 §09.6`):
    - The `metrics.service.ts` exposes Prometheus-formatted metrics. Identify the two metrics that are new compared to Basic Code and explain what they count.

12. **Pino logging with redaction** (`Chapter 09 §09.7`):
    - `src/lib/logger.ts` uses pino with redaction. Describe what categories of sensitive data are redacted (hint: tenant IDs, trace IDs, model names) and why.

### Part 3 — Code-Centric Tasks

15. **Add a new enforcement rung** (`Chapter 06 §06.4`):
    - Add a 5th rung called `structured_outputs` to the enforcement ladder in `src/providers/enforcement.ts`. The rung should try `tool_choice: "json"` first, then fall back to the existing 3-rung ladder. Wire it into the extraction pipeline so the controller can select it via a query parameter.

16. **Cache key collision test** (`Chapter 09 §09.5.3`):
    - Write a unit test (in `tests/` or inline) that proves two different tenants with the same input text get different cache outcomes. Use the golden-set harness (`src/services/evaluation.service.ts`) to assert this.

### Part 4 — Integration & Evaluation

21. **End-to-end smoke test** (`Chapter 09 §09.4`):
    - Run `npm run eval` (or equivalent) and capture the full report. Verify that:
      a. `firstPassValidityRate` ≥ 0.5 (the default gate threshold).
      b. `finalFailureRate` ≤ 0.05.
      c. `refusalAccuracy` = 1 (all refusal cases are correct).
      d. Tag coverage includes all five tags: `clean`, `ambiguous`, `adversarial`, `edge`, `regression`.

22. **Schema check** (`Chapter 09 §09.4`):
    - Run `npm run schema:check` and confirm no schema drift between the TypeScript `Meeting` type and the JSON Schema `MEETING_JSON_SCHEMA`.

23. **Git cleanliness** (`Chapter 09 §09.9`):
    - Confirm `git status` shows only changes inside `Lecture 10 - Structured Outputs/`. Other repos (Forward-Deployed-Engineer, gen-ai-cohort) must stay clean.

---
17. **Prometheus endpoint** (`Chapter 09 §09.6`):
    - Add a `/metrics` route (in `src/routes/index.ts` or `src/controllers/`) that returns the Prometheus exposition format. The endpoint should accept a `?model=` query parameter to set the `labels=` in the exposition text.

18. **Debug-store integration** (`Chapter 09 §09.8`):
    - Wire the `debugRecord` and `debugTrace` methods from `src/middleware/error.ts` / `src/controllers/extraction.controller.ts` so that a `GET /debug/:traceId` endpoint returns the stored trace when `DEBUG_STORE_ENABLED=true`, and returns 404 with a descriptive message otherwise.

19. **Release gate thresholds** (`Chapter 09 §09.4`):
    - In `src/services/evaluation.service.ts`, the `DEFAULT_GATE` has fixed thresholds. Modify the gate so the thresholds are read from a `.env` variable (e.g. `GATE_FIRST_PASS_RATE`, `GATE_FIELD_ACCURACY`, etc.) with the listed defaults as fallbacks.

20. **Extend the golden set** (`Chapter 09 §09.3`):
    - Add three new golden-set cases to `data/golden-set.json`:
      a. A case where the model must refuse (adversarial prompt that tries to get it to output a full meeting object).
      b. A case where a field must be null (e.g. `cancelled` should be null when the meeting was not cancelled).
      c. An edge case with a time-zone relative date (e.g. "tomorrow at 9am" resolved via the `timeZone` request parameter).

---
13. **Debug store (two-store pattern)** (`Chapter 09 §09.8`):
    - The debug store is opt-in and follows a two-store pattern. Explain the distinction between the volatile in-memory store and the persistent store, and how `config.DEBUG_STORE_ENABLED` gates access.

14. **Four provider wire-contract variants** (`Chapter 09 §09.5.2`):
    - Production Code supports four wire‑contract variants (beyond the Basic Code's single `openai` wire target). Name them and explain when each is used.

---### Bonus — Course-Level Topics

24. **Chapter index** (`index.md`):
    - The Lecture 10 `index.md` file currently exists but is empty (0 bytes). Populate it with a structured table of contents that links to all 9 chapter notes (01–09) and the assignment, using the format: `- [Chapter 01](#) - ... - [Assignment](#)`. This enables navigation in the courseware.

25. **README/roadmap checklist** (`roadmap.md`):
    - The `roadmap.md` file tracks block progress. Add tick marks for all 5 completion blocks:
      - Block 1: Notes written (already done)
      - Block 2: Basic Code scaffold + write (already verified)
      - Block 3: Basic Code verify (already verified: `npm install` OK, `tsc --noEmit` OK, `tsc` build OK, smoke tests pass)
      - Block 4: Production Code finish + verify (pending: complete `src/controllers/`, `src/routes/`, `src/middleware/`, `src/errors/`, `src/main.ts`, `src/eval/`, `data/golden-set.json`, `tests/`, `.env`, `.env.example`, `.gitignore`)
      - Block 5: Write implementations guide (pending: chapter-wise `01_Overview_and_File_Structure.md` onward)
    - Verify `git status` shows only changes inside `Lecture 10 - Structured Outputs/` (other two repos must stay clean).

26. **Optional: Assignment task answers** (`answers.md`):
    - Create a companion `Assignment/answers.md` file where students can store their written responses to Part 1 (Q1–Q5) and Part 2 (Q6–Q14) questions. This keeps answers separate from the practice questions.

27. **Optional: Code review checklist**:
    - After completing the Production Code implementation, run a code review checklist covering:
      - All `zod.safeParse` calls present and used (no bare `parse`)
      - Every outcome kind mapped to a status in `OUTCOME_STATUS`
      - Cache key includes (tenant, text, model, schemaVersion) — no missing dependencies
      - Prometheus labels follow `model="..."`, `schema_version="..."` convention
      - Logger redaction covers: tenant IDs, trace IDs, model names, error stacks
      - Debug store two-store pattern: volatile in-memory + persistent (TTL-gated)
      - Release gate thresholds read from `.env` with defaults as fallbacks
      - Golden set covers all 5 tags: clean, ambiguous, adversarial, edge, regression
      - `evaluateGate` function returns `{ passed, breaches }` shape
      - No `console.log` statements in production source
      - TypeScript compiles with `tsc --noEmit` and `npm run build`

28. **Optional: CI pipeline snippet**:
    - Add a GitHub Actions workflow `.github/workflows/lecture10.yml` that runs:
      - `npm install`
      - `npx tsc --noEmit`
      - `npm run build`
      - `npm run eval` and fail if `firstPassValidityRate < 0.5`
      - `npm run schema:check`
      - `git status --porcelain | grep -c "Lecture 10"` to verify changes stay within the repo

---
---