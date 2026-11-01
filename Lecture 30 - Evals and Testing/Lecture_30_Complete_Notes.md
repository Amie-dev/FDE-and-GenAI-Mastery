# Lecture 30 Complete Notes – Evals and Testing

> **Note:** This file is a consolidated reference built from the nine chapters in this Lecture 30 directory. It does not include the same depth as the individual chapter files; for detailed explanations, see each chapter.

---

## Quick Reference Guide

### Core Concepts
- **Evals** – systematic measurements of whether an AI system behaves as intended
- **Test case** – input + expected behaviour
- **Evaluation dataset** – fixed collection of test cases (inputs only)
- **Golden dataset** – dataset that also carries reference answers or expected behaviours
- **Deterministic eval** – judged by code (facts, JSON schema, tool calls, latency)
- **LLM-as-a-Judge** – another model instance that scores using a rubric (semantics, tone, helpfulness)
- **Human eval** – gold‑standard ratings by people (requires calibration)

### Key Metrics
- **Answer Relevance** (1–5) – does it answer the question?
- **Factual Correctness** (1–5) – are facts true vs ground truth?
- **Faithfulness / Groundedness** (1–5) – are claims supported by context?
- **Completeness** (1–5) – does it cover all required sub‑topics?
- **Tone / Style** (1–5) – brand‑appropriate language?
- **Citation Precision/Recall** (0–1) – relevance and coverage of evidence
- **Tool Accuracy** (0–1) – correct tool calls with correct args
- **Refusal Appropriateness** (pass/fail) – correct refusal / not refuse
- **Safety / Policy** (pass/fail) – no PII, hate, dangerous instructions

### Eval Types
| Type | Speed | Cost | When to use |
|---|---|---|---|
| Deterministic (code) | Instant | Free | Facts, structure, tool calls, latency |
| LLM‑Judge (model) | Seconds | $$$ | Semantic quality, tone, completeness |
| Human (people) | Hours‑days | $$$ | Gold labels, calibration, edge cases |

### Evaluation Pipeline
1. **Offline (CI)** – pre‑flight check on every PR (deterministic fast, LLM judge sample, optional human)
2. **Online (production)** – live monitoring of a sample of queries, drift detection, alerting, rollback

> **Core principle:** *deterministic checks first, LLM judge sample next, humans periodic for calibration.*

---

## Detailed Outline (per chapter)

### Chapter 1 – Why AI Needs Evals
- Traditional software testing rests on determinism and exactness; AI removes both.
- The deferred question: **How do we know the system is doing its job correctly?**
- AI answers have multiple correct phrasings → need property‑based assertions, not exact string equality.
- Anti‑pattern: “Looks good to me” has no baseline, no repeatability, no diff.
- Silent regressions (e.g., `topK 5 → 3` drops a document that ranked #4).
- The real engineering problem: **how to systematically measure behaviour of a probabilistic application?**
- Vocabulary fix: Eval, Test case, Evaluation dataset, Golden dataset, Metric, Evaluator, Score, Baseline, Regression, Benchmark.

### Chapter 2 – Anatomy of an Eval
- Every eval has **four required pieces**: Test Input, Expected Behaviour, Evaluator, Score.
- **Test Input** = exact prompt (question + context + history + tool fixtures) – the system sees at inference time.
- **Expected Behaviour** = checkable property (must‑include, must‑not‑include, JSON schema, tool call expectation, citation requirement).
- **Evaluator** = code (deterministic), LLM judge (semantic), human (gold).
- **Score** = number (1–5, 0–1) or pass/fail.
- Evaluate the **whole system** (prompt + retrieval + tools + model), not just the model.
- Component evals (retrieval, generation, tool, citation) feed into system‑level evals.
- **Eval spec** template with four sections: Test Inputs, Expected Behaviours, Evaluators, Thresholds.

### Chapter 3 – Evaluation Datasets and Golden Data
- **Evaluation dataset** = inputs only (test cases). Enables consistency measurement.
- **Golden dataset** = inputs + reference answers / expected behaviours (enables correctness measurement).
- Build from production logs, support tickets, surveys, synthetic generation; human vet for quality.
- Version under git tags (`v1.0.0`, `v1.1.0`).
- Metadata for slicing: domain, difficulty, language, source, priority.
- Quality checks: format validation, context completeness, ground truth integrity, reproducibility.
- Retrieval snapshot + tool fixtures ensure evals match production context.

### Chapter 4 – Deterministic Evaluation
- **Four sub‑types**: String/regex, JSON schema, Tool call verification, Latency / budget.
- Use code checks for facts (`contains("30 days")`), structure (`validateJsonSchema`), tools (`toolCallVerified`), performance (`checkLatency`).
- **Deterministic eval gap:** 80% of regressions are deterministic; remaining 20% require LLM judge or human.
- Component evals (retrieval, generation, tool, citation) are deterministic and run fast in CI.
- Pseudo‑code: run system on every test case → apply all deterministic evaluators → aggregate scores.

### Chapter 5 – AI Quality Metrics
- Catalog of quality metrics: Answer Relevance, Factual Correctness, Faithfulness, Completeness, Tone, Citation Precision/Recall, Refusal Appropriateness, Safety, Helpfulness.
- Each metric has a **scale** (1–5 or 0–1), **rubric**, **typical evaluator**.
- **Thresholds** turn metrics into release gates (e.g., faithfulness ≥ 4.0 / 5, citation precision ≥ 0.90).
- **Calibration** – align LLM judges with humans (Kappa ≥ 0.7).
- **Reporting** – overall mean / median + slice heatmaps (domain, difficulty, language).

### Chapter 6 – LLM-as-a-Judge
- LLM judges answer *semantic* questions that code can’t (tone, completeness, faithfulness).
- Prompt structure: Role → Inputs → Rubric → Output Format.
- Force **structured output** (JSON) for aggregation.
- **Calibration** required before deployment: compute Kappa between LLM scores and human majority.
- Cost control: sample, batch, cache, smaller model, judge only failures.
- Never self‑evaluate (use a different model / provider).
- Integration: deterministic checks → LLM judge sample → threshold gate.

### Chapter 7 – Rubrics, Pointwise vs Pairwise, Human Evaluation
- **Rubric design:** One criterion per bullet, explicit 1/5 and 5 anchors, 2–4 concrete examples per anchor, negative examples.
- **Pointwise** = rate each answer independently (1–5) → mean/median aggregates.
- **Pairwise** = compare two answers (A vs B) → win‑rate aggregates.
- Start with **pointwise** for absolute thresholds; use **pairwise** for direct A/B decisions.
- **Human eval** – in‑house or crowdsourced; QC (attention, qualification, Kappa); iterative rubric refinement.
- **Calibration** – same principle as LLM judges (Kappa ≥ 0.7).
- **Combination** – humans periodically calibrate the LLM judge; LLM runs every CI; humans sample for drift checks.

### Chapter 8 – RAG and System-Level Evaluation
- **RAG pipeline** breakdown: Embedding → Vector Search → Chunking → Prompt Assembly → Generation.
- **System‑level evals** measure the whole pipeline (recall@k, faithfulness, relevance, tool accuracy, latency).
- **Component evals** isolate each step (retrieval recall, embedding quality, prompt format, generation baseline).
- **Four‑layer evaluation pipeline:** Pre‑deployment (golden data + deterministic + LLM + human), During changes (CI with component then system evals), Production (continuous monitoring).
- RAG‑specific thresholds (e.g., recall@k ≥ 0.90, faithfulness ≥ 4.0 / 5, tool accuracy ≥ 0.95).

### Chapter 9 – Offline and Online Evaluation
- **Offline (CI)** – every PR: deterministic checks (fast) → LLM judge sample (slow) → optional human review.
- **Online (production)** – live query sampling, statistical drift detection, alerting, rollback.
- **Sampling strategies:** deterministic hash, random, stratified, trigger‑based.
- **Data flow:** Instrument → Sample → LLM judge → Store (time‑series DB) → Analyze (rolling avg, drift, alerts).
- **Thresholds:** tighter offline (prevent bad releases) + looser online (detect slow drift).
- **Alert & rollback:** PagerDuty + scriptable rollback; isolate slice + quick diagnosis.

---

## Key Takeaways

1. **Evaluation is a regression‑testing layer** – it lets you change a prompt on Tuesday without gambling the product.
2. **Start simple, scale smart:** deterministic checks for facts/structure/tools/latency; LLM judges for semantics; humans for calibration and gold labels.
3. **Test the whole system**, not just the model. Retrieval, chunking, prompt assembly and tools all affect quality.
4. **Dataset versioning matters** – treat the evaluation dataset like source code. One version per release.
5. **Thresholds turn metrics into gates** – mean ≥ 4.0, pass‑rate ≥ 90%, zero regressions on calibration set.
6. **Calibration is non‑negotiable** – Kappa ≥ 0.7 before trusting LLM judges or human results.
7. **Offline evals are the primary gate**, online evals are the early warning system for runtime drift.
8. **One rubric, one scale** – use pointwise rubrics for absolute thresholds; pairwise only when comparing two versions.

---

## Next Steps for Teams

1. **Create an eval spec** for the first feature you want to protect.
2. **Build an evaluation dataset** from support tickets + one synthetic edge case.
3. **Add deterministic checks** (string match, JSON schema, tool verification, latency).
4. **Write a rubric** (role, inputs, criteria, output) and calibrate with humans.
5. **Deploy LLM judge** (sample 5% of cases) in CI.
6. **Set up online monitoring** (sample 1 in 20 queries) with drift detection.
7. **Iterate:** add new test cases, refine rubrics, expand sampling.

---

**Back to:** [Lecture 30 — Chapter Index](./README.md) · [Individual Chapter Notes](./notes/README.md)

---

*Lecture 30 created: November 1, 2026* • *Framework based on Forward‑Deployed‑Engineer Lectures 17 and 18* • *Built for GenAI mastery, not for production copy‑paste.*

---

## Chapter Index (quick links)

1. [01_Why_AI_Needs_Evals](./notes/01_Why_AI_Needs_Evals.md)
2. [02_Anatomy_Of_An_Eval](./notes/02_Anatomy_Of_An_Eval.md)
3. [03_Evaluation_Datasets_And_Golden_Data](./notes/03_Evaluation_Datasets_And_Golden_Data.md)
4. [04_Deterministic_Evaluation](./notes/04_Deterministic_Evaluation.md)
5. [05_AI_Quality_Metrics](./notes/05_AI_Quality_Metrics.md)
6. [06_LLM_as_a_Judge](./notes/06_LLM_as_a_Judge.md)
7. [07_Rubrics_Pointwise_Pairwise_Human.md](./notes/07_Rubrics_Pointwise_Pairwise_Human.md)
8. [08_RAG_and_System-Level_Evaluation.md](./notes/08_RAG_and_System-Level_Evaluation.md)
9. [09_Offline_and_Online_Evaluation.md](./notes/09_Offline_and_Online_Evaluation.md)

---

*All notes are intended for learning, not for direct production use without adaptation.*

---

**Permission notice:** This Lecture 30 material is for educational use only. Do not copy verbatim into production systems without adapting to your specific use‑case and privacy constraints.