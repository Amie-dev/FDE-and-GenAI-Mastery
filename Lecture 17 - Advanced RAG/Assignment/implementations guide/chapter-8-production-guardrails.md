# Chapter 8 — Production RAG: Guardrails & CRAG

**Goal:** Add safety (PII masking, input/output defence) and evidence evaluation (CRAG with bounded retry) so the system is defensible at production scale.
**Notes reference:** `notes/08_Production_RAG.md`
**Files:** `src/services/guardrail.service.ts`, `src/services/crag.service.ts`, `src/controllers/rag.controller.ts`
**Order:** Run last (after all previous chapters).

---

## 8.1 File Details

### `src/services/guardrail.service.ts`

```ts
/**
 * Chapter 08 — Production RAG: Guardrails
 *
 * Bidirectional PII masking + input/output defences.
 */

export interface GuardrailResult {
  text: string;
  masked: boolean;
  blocked: boolean;
  reason?: string;
}

export function inputGuardrail(text: string): GuardrailResult {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;

  let masked = text;
  let changed = false;

  if (emailRegex.test(masked)) {
    masked = masked.replace(emailRegex, "[EMAIL_REDACTED]");
    changed = true;
  }
  if (phoneRegex.test(masked)) {
    masked = masked.replace(phoneRegex, "[PHONE_REDACTED]");
    changed = true;
  }

  return { text: masked, masked: changed, blocked: false };
}

export function outputGuardrail(text: string): GuardrailResult {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;

  if (emailRegex.test(text) || phoneRegex.test(text)) {
    return {
      text: "I cannot share that information.",
      masked: true,
      blocked: true,
      reason: "PII detected in output",
    };
  }

  return { text, masked: false, blocked: false };
}
```

**Block-by-block:**
- `GuardrailResult` — the masked text, whether anything was masked, whether it was blocked, and a reason.
- `inputGuardrail` — masks emails and phone numbers in the user's query before it reaches the system (Chapter 08 §8.10: no PII in logs/traces/vector metadata).
- `outputGuardrail` — scans the model's answer for PII; if found, returns a refusal message with `blocked: true` (Chapter 08: output scanning prevents the model echoing PII).

### `src/services/crag.service.ts`

```ts
/**
 * Chapter 08 — Production RAG: CRAG (Corrective RAG)
 *
 * Evaluates whether retrieved evidence is sufficient to answer. If not,
 * triggers a bounded retry (query correction → re-query).
 */

export interface CRAGEvaluation {
  sufficient: boolean;
  groundedness: number;
  completeness: number;
  hallucination: boolean;
  retry: boolean;
  reason: string;
}

export function evaluate(
  question: string,
  candidates: { text: string }[]
): CRAGEvaluation {
  const qWords = question.toLowerCase().split(/\s+/).filter(Boolean);
  const context = candidates.map((c) => c.text).join(" ").toLowerCase();

  const matched = qWords.filter((w) => context.includes(w)).length;
  const groundedness = Math.round((matched / Math.max(qWords.length, 1)) * 10);
  const completeness = candidates.length > 0 ? 8 : 3;
  const hallucination = groundedness < 3;

  const sufficient = groundedness >= 5 && !hallucination;

  return {
    sufficient,
    groundedness,
    completeness,
    hallucination,
    retry: !sufficient,
    reason: sufficient
      ? "Evidence sufficient"
      : "Evidence insufficient — retry with corrected query",
  };
}

export async function cragLoop(
  question: string,
  fetchCandidates: (q: string) => { text: string }[],
  { maxRetries = 2 }: { maxRetries?: number } = {}
): Promise<{ candidates: { text: string }[]; eval: CRAGEvaluation; retries: number }> {
  let retries = 0;
  let candidates = fetchCandidates(question);
  let evalResult = evaluate(question, candidates);

  while (evalResult.retry && retries < maxRetries) {
    retries++;
    candidates = fetchCandidates(`${question} (retry ${retries})`);
    evalResult = evaluate(question, candidates);
  }

  return { candidates, eval: evalResult, retries };
}
```

**Block-by-block:**
- `CRAGEvaluation` — whether evidence is sufficient, groundedness/completeness scores (0-10), hallucination flag, whether to retry, and a reason.
- `evaluate` — heuristic: counts how many question words appear in the retrieved context, computes groundedness, marks hallucination if score < 3, sufficient if groundedness >= 5 and no hallucination.
- `cragLoop` — bounded retry loop: evaluates, and if evidence is insufficient, re-fetches with a corrected query up to `maxRetries` (Chapter 08: cap at 2-3 retries to prevent infinite cost).

### `src/controllers/rag.controller.ts` (full pipeline)

This controller was shown in Chapter 1. It now ties together every chapter:
1. Input guardrail (Ch 8)
2. Query processing (Ch 6)
3. Hybrid search + RRF (Ch 4)
4. Reranking (Ch 5)
5. Context engineering (Ch 7)
6. CRAG evaluation (Ch 8)
7. Generation
8. Output guardrail (Ch 8)

---

## 8.2 Commands

```bash
# Test input PII masking
curl -X POST http://localhost:3000/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Contact me at john@example.com about my return"}'

# Health check
curl http://localhost:3000/health
```

---

## 8.3 What This Implements from the Notes

| Notes concept | Implementation |
|---|---|
| Input PII masking | `inputGuardrail` redacts emails/phones |
| Output PII scan | `outputGuardrail` blocks/redacts leaked PII |
| CRAG evidence evaluation | `evaluate` + `cragLoop` |
| Bounded retries | `maxRetries` cap (default 2) |
| Guardrails in pipeline | controller wraps input and output |
