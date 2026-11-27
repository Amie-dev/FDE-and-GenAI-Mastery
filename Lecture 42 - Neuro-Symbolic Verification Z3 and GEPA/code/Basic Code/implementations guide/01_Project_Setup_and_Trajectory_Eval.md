# Chapter 01: Project Setup, Types & Trajectory Evaluator

> **Chapter goal:** configure `package.json` / `tsconfig.json` / `src/types.ts` and implement `scoreTrajectory()` (`src/trajectory-eval.ts`).
> **Notes chapters covered:** 01 (Trajectory Evaluation) & 02 (Tool-Action Correctness).

---

## 1.1 Full code: `package.json`, `tsconfig.json` & `src/types.ts`

File path: `code/Basic Code/package.json`

```json
{
  "name": "lecture-41-neuro-symbolic-z3-gepa",
  "version": "1.0.0",
  "description": "Lecture 42 Basic Code — Trajectory Evaluator, Z3 SMT Policy Verifier & GEPA Optimizer",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "z3-solver",
    "neuro-symbolic",
    "trajectory-eval",
    "gepa",
    "property-based-testing",
    "typescript"
  ],
  "license": "ISC",
  "dependencies": {
    "z3-solver": "^4.13.4"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

File path: `code/Basic Code/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

File path: `code/Basic Code/src/types.ts`

```ts
export interface ActionStep {
  tool: "getOrder" | "verifyPolicy" | "requestHitlApproval" | "refundOrder";
  amountUsd?: number;
}

export interface AgentActionPlan {
  goal: string;
  steps: ActionStep[];
  hasHitlApproval: boolean;
}

export interface TrajectoryScore {
  toolRecall: number;
  preconditionOrderOk: boolean;
  argumentAccuracy: number;
  stepEfficiency: number;
  overallScore: number;
}

export interface Z3VerificationResult {
  sat: boolean;
  violatedPolicies: string[];
}

export interface GepaEvalCase {
  id: string;
  goal: string;
  expectedAmountUsd: number;
}

export interface GepaOptimizationReport {
  baselinePassRate: number;
  optimizedPassRate: number;
  baselineTokens: number;
  optimizedTokens: number;
  evolvedInstructions: string[];
}
```

---

## 1.2 Full code: `src/trajectory-eval.ts`

File path: `code/Basic Code/src/trajectory-eval.ts`

```ts
import type { AgentActionPlan, TrajectoryScore } from "./types.js";

/**
 * Evaluates an agent's intermediate tool-call trajectory (not just final output)
 * across tool recall, precondition ordering, argument accuracy, and step efficiency.
 */
export function scoreTrajectory(params: {
  plan: AgentActionPlan;
  requiredTools: string[];
  expectedRefundUsd: number;
  goldenStepsCount: number;
}): TrajectoryScore {
  const calledTools = params.plan.steps.map((s) => s.tool);
  const uniqueCalled = new Set(calledTools);

  const hits = params.requiredTools.filter((t) => uniqueCalled.has(t as AgentActionPlan["steps"][number]["tool"])).length;
  const toolRecall = params.requiredTools.length > 0 ? hits / params.requiredTools.length : 1;

  const verifyIdx = calledTools.indexOf("verifyPolicy");
  const refundIdx = calledTools.indexOf("refundOrder");
  const preconditionOrderOk = refundIdx === -1 || (verifyIdx !== -1 && verifyIdx < refundIdx);

  const refundStep = params.plan.steps.find((s) => s.tool === "refundOrder");
  const argumentAccuracy = refundStep && refundStep.amountUsd === params.expectedRefundUsd ? 1 : 0;

  const actualSteps = Math.max(1, params.plan.steps.length);
  const stepEfficiency = Math.min(1, params.goldenStepsCount / actualSteps);

  const overallScore = Number(
    (
      0.3 * toolRecall +
      0.3 * (preconditionOrderOk ? 1 : 0) +
      0.25 * argumentAccuracy +
      0.15 * stepEfficiency
    ).toFixed(3)
  );

  return {
    toolRecall: Number(toolRecall.toFixed(3)),
    preconditionOrderOk,
    argumentAccuracy,
    stepEfficiency: Number(stepEfficiency.toFixed(3)),
    overallScore,
  };
}
```

### Explanation
- **`scoreTrajectory()`:** Grades four independent path signals (`toolRecall`, `preconditionOrderOk`, `argumentAccuracy`, `stepEfficiency`) so an agent that skips `verifyPolicy` scores `< 0.7` even if it calls `refundOrder` with the right dollar amount.

