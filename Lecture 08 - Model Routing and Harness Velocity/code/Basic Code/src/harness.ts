import { ModelTier, routeRequest } from "./router.js";

export interface AgentPatch {
  authorTier: ModelTier;
  changedFiles: string[];
  code: string;
  explanation: string;
}

export interface SandboxTestResult {
  passed: boolean;
  exitCode: number;
  stderr: string;
}

export interface ReviewFinding {
  severity: "blocker" | "warning";
  rule: string;
  message: string;
}

export interface ReviewVerdict {
  approved: boolean;
  findings: ReviewFinding[];
}

export interface HarnessIterationLog {
  iteration: number;
  dispatchedTier: ModelTier;
  sandboxPassed: boolean;
  reviewApproved: boolean;
  rejectionReason?: string;
}

export interface HarnessRunResult {
  status: "APPROVED" | "FAILED_MAX_ITERATIONS" | "BLOCKED_REWARD_HACKING";
  iterations: HarnessIterationLog[];
  finalPatch?: AgentPatch;
}

const PROTECTED_TEST_PREFIXES = ["src/release-gate.test.ts", "tests/"];

/**
 * Reward-hacking guard: reject any patch that modifies protected release-gate test files.
 */
export function assertTestsUnmodified(changedFiles: string[]): void {
  const tampered = changedFiles.filter((file) =>
    PROTECTED_TEST_PREFIXES.some((prefix) => file.startsWith(prefix))
  );
  if (tampered.length > 0) {
    throw new Error(`Reward-hacking guard triggered: patch attempted to modify ${tampered.join(", ")}`);
  }
}

/**
 * Independent fresh-context System-2 reviewer.
 * Evaluates only the patch code and AGENTS.md invariants — never trusts author prose.
 */
export function reviewPatch(patch: AgentPatch): ReviewVerdict {
  const findings: ReviewFinding[] = [];

  if (/\b:\s*any\b/.test(patch.code) || /@ts-ignore/.test(patch.code)) {
    findings.push({
      severity: "blocker",
      rule: "AGENTS.md#invariants",
      message: "Forbidden `any` type or `@ts-ignore` suppression detected.",
    });
  }

  if (/catch\s*\([^)]*\)\s*\{\s*return\s+(?:null|undefined|true|\{\})\s*;?\s*\}/.test(patch.code)) {
    findings.push({
      severity: "blocker",
      rule: "SDD#error-propagation",
      message: "Swallowing exceptions in empty catch block violates spec error-propagation invariant.",
    });
  }

  return {
    approved: findings.every((f) => f.severity !== "blocker"),
    findings,
  };
}

/**
 * Run the SDD/TDD + Independent Review loop inside an isolated sandbox.
 * 1. Verify RED first (baseline test must fail before patching).
 * 2. Route initial attempt to System-1; on sandbox or review failure, escalate to System-2.
 * 3. Enforce reward-hacking guard on every candidate patch.
 */
export function runSddTddLoop(params: {
  specPrompt: string;
  verifyRedFirst: () => SandboxTestResult;
  generatePatch: (tier: ModelTier, iteration: number, feedback?: string) => AgentPatch;
  runInSandbox: (patch: AgentPatch) => SandboxTestResult;
  maxIterations?: number;
}): HarnessRunResult {
  const maxIterations = params.maxIterations ?? 3;

  // Step 1: Verify RED before generating any implementation
  const redCheck = params.verifyRedFirst();
  if (redCheck.passed) {
    throw new Error("SDD/TDD violation: test passed in RED phase before implementation existed.");
  }

  const iterations: HarnessIterationLog[] = [];
  let lastFeedback: string | undefined;

  for (let i = 1; i <= maxIterations; i++) {
    const decision = routeRequest(params.specPrompt, 600, {
      priorAttemptFailed: i > 1,
    });
    const patch = params.generatePatch(decision.tier, i, lastFeedback);

    // Step 2: Reward-hacking guard
    try {
      assertTestsUnmodified(patch.changedFiles);
    } catch (err) {
      iterations.push({
        iteration: i,
        dispatchedTier: decision.tier,
        sandboxPassed: false,
        reviewApproved: false,
        rejectionReason: (err as Error).message,
      });
      return { status: "BLOCKED_REWARD_HACKING", iterations };
    }

    // Step 3: Deterministic sandbox test gate
    const sandboxResult = params.runInSandbox(patch);
    if (!sandboxResult.passed) {
      lastFeedback = sandboxResult.stderr;
      iterations.push({
        iteration: i,
        dispatchedTier: decision.tier,
        sandboxPassed: false,
        reviewApproved: false,
        rejectionReason: `Sandbox test failed: ${sandboxResult.stderr}`,
      });
      continue;
    }

    // Step 4: Independent System-2 review gate
    const verdict = reviewPatch(patch);
    if (!verdict.approved) {
      lastFeedback = verdict.findings.map((f) => `${f.rule}: ${f.message}`).join("; ");
      iterations.push({
        iteration: i,
        dispatchedTier: decision.tier,
        sandboxPassed: true,
        reviewApproved: false,
        rejectionReason: `Independent review rejected: ${lastFeedback}`,
      });
      continue;
    }

    iterations.push({
      iteration: i,
      dispatchedTier: decision.tier,
      sandboxPassed: true,
      reviewApproved: true,
    });
    return { status: "APPROVED", iterations, finalPatch: patch };
  }

  return { status: "FAILED_MAX_ITERATIONS", iterations };
}

