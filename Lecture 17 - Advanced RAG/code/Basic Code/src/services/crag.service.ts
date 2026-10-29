/**
 * Chapter 08 — Production RAG: CRAG (Corrective RAG)
 *
 * Evaluates whether retrieved evidence is sufficient to answer. If not,
 * triggers a bounded retry (query correction → re-query). Cap at 2–3 retries.
 */

export interface CRAGEvaluation {
  sufficient: boolean;
  groundedness: number;   // 0..10
  completeness: number;   // 0..10
  hallucination: boolean;
  retry: boolean;
  reason: string;
}

/**
 * Simple heuristic evaluation: if candidates exist and contain keywords
 * from the question, evidence is considered sufficient.
 */
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

/**
 * Bounded CRAG loop: evaluate, retry up to maxRetries, then proceed anyway.
 */
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