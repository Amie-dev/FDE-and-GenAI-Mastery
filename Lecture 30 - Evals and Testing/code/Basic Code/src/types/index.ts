// types/index.ts — Shared TypeScript interfaces for the Eval & Testing app
// Maps to Lecture 30 notes: Chapter 02 (anatomy of an eval), Chapter 03 (test cases / golden data)

/** Everything the system sees at inference time (Chapter 02 — Test Input). */
export interface TestInput {
  id: string;                                // test case id
  question: string;                          // user question
  context?: string[];                        // retrieved chunks
}

/** Checkable properties the output must satisfy (Chapter 02 — Expected Behaviour). */
export interface ExpectedBehaviour {
  mustInclude?: string[];                    // facts that must appear in the answer
  requiredTool?: string;                     // tool that must have been called
}

/** One test case: input + expected behaviour (Chapter 03 — test case). */
export interface EvalCase {
  id: string;
  input: TestInput;
  expected: ExpectedBehaviour;
}

/** Score produced by one deterministic evaluator. */
export interface MetricScore {
  name: string;                              // e.g. "include:30 days"
  score: number;                             // 1 or 0
  passed: boolean;
}

/** Result for one test case (Chapter 02 — Score). */
export interface EvalResult {
  caseId: string;
  scores: MetricScore[];
  passed: boolean;                           // all thresholds met for this case
}

/** Whole-suite report (Chapter 02 — Aggregate). */
export interface EvalReport {
  suiteName: string;
  totalCases: number;
  passedCases: number;
  results: EvalResult[];
}