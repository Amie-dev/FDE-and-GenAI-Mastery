// services/evaluationService.ts — Deterministic evaluators + eval runner
// Maps to Lecture 30 notes: Chapter 02 (anatomy of an eval), Chapter 04 (deterministic evaluation)

import { EvalCase, EvalReport, EvalResult, TestInput } from "../types/index.js";

/** Chapter 04 — string / regex: does the answer contain a required fact? */
export function factInclusion(answer: string, fact: string): boolean {
  return answer.toLowerCase().includes(fact.toLowerCase());
}

/** Chapter 04 — JSON schema: is the output valid JSON with all required keys? */
export function jsonSchemaCheck(output: string, requiredKeys: string[]): boolean {
  try {
    const parsed = JSON.parse(output);
    return requiredKeys.every((key) => key in parsed);
  } catch {
    return false;
  }
}

/** Chapter 04 — tool call verification: was the expected tool called? */
export function toolCallCheck(
  calls: { name: string }[],
  expectedName: string,
): boolean {
  return calls.some((call) => call.name === expectedName);
}

/** Chapter 02 — run one test case through the system + deterministic evaluators. */
export function runCase(
  caseItem: EvalCase,
  output: { answer: string; toolCalls?: { name: string }[] },
): EvalResult {
  const scores = [];
  const { answer, toolCalls = [] } = output;

  // String inclusion checks (Chapter 04 — string / regex)
  for (const fact of caseItem.expected.mustInclude || []) {
    const passed = factInclusion(answer, fact);
    scores.push({ name: `include:${fact}`, score: passed ? 1 : 0, passed });
  }

  // Tool call verification (Chapter 04 — tool calls)
  if (caseItem.expected.requiredTool) {
    const passed = toolCallCheck(toolCalls, caseItem.expected.requiredTool);
    scores.push({
      name: `tool:${caseItem.expected.requiredTool}`,
      score: passed ? 1 : 0,
      passed,
    });
  }

  const passed = scores.every((s) => s.passed);
  return { caseId: caseItem.id, scores, passed };
}

/** Chapter 02 — run the whole eval suite (the eval runner). */
export function runEval(
  suiteName: string,
  cases: EvalCase[],
  system: (input: TestInput) => { answer: string; toolCalls?: { name: string }[] },
): EvalReport {
  const results = cases.map((tc) => {
    const output = system(tc.input);
    return runCase(tc, output);
  });

  return {
    suiteName,
    totalCases: cases.length,
    passedCases: results.filter((r) => r.passed).length,
    results,
  };
}