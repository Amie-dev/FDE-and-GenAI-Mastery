# Chapter 01: Project Setup, TypeScript & Shared Domain Types

> **Chapter goal:** configure strict ESM TypeScript (`package.json`, `tsconfig.json`) and define the shared domain contracts in `src/types.ts`.
> **Notes chapters covered:** 01–07.

---

## 1.1 Full code: `package.json` & `tsconfig.json`

File path: `code/Basic Code/package.json`

```json
{
  "name": "lecture-14-loop-engineering-a2a",
  "version": "1.0.0",
  "description": "Lecture 14 Basic Code — Plan-Act-Verify Loop, Stuck Detection, Proactive Triggers & A2A Delegation",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "plan-act-verify",
    "stuck-detection",
    "a2a-protocol",
    "agent-loops",
    "typescript"
  ],
  "license": "ISC",
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

### Explanation
- `"type": "module"` + `"module": "ESNext"` + `"moduleResolution": "bundler"` enables native ESM imports with `.js` extensions in TypeScript (`import { ... } from "./budgets.js"`).
- `tsx` runs TypeScript directly and supports `tsx --test` with Node's built-in `node:test` runner, avoiding heavy external test frameworks.

---

## 1.2 Full code: `src/types.ts`

File path: `code/Basic Code/src/types.ts`

```ts
export type PermissionLevel = "READ_ONLY" | "SCOPED_WRITE" | "APPROVAL_REQUIRED" | "FORBIDDEN";

export interface LoopBudgetConfig {
  maxSteps: number;
  maxTokens: number;
  maxCostUsd: number;
  maxDurationMs: number;
  maxPivots: number;
}

export interface BudgetSnapshot {
  stepsUsed: number;
  tokensUsed: number;
  costUsd: number;
  elapsedMs: number;
}

export type ToolErrorClass = "transient" | "structural";

export interface PlanStep {
  id: string;
  toolName: string;
  args: Record<string, string>;
  permission: PermissionLevel;
  expectedPostCondition: string;
}

export interface ToolExecutionResult {
  ok: boolean;
  output?: string;
  error?: string;
  errorClass?: ToolErrorClass;
  tokensUsed: number;
  costUsd: number;
}

export type StuckDecision =
  | { action: "CONTINUE" }
  | { action: "RETRY"; reason: string }
  | { action: "PIVOT"; reason: string; bannedSignature: string }
  | { action: "ESCALATE"; reason: string; bannedSignature: string };

export interface EscalationPacket {
  reason: "STUCK_MAX_PIVOTS" | "BUDGET_EXCEEDED" | "APPROVAL_REQUIRED";
  goal: string;
  completedSteps: string[];
  lastError: string;
  suggestedHumanAction: string;
}

export interface AgentSkill {
  id: string;
  name: string;
  tags: string[];
}

export interface AgentCard {
  name: string;
  url: string;
  version: string;
  skills: AgentSkill[];
}

export type A2ATaskState = "submitted" | "working" | "completed" | "failed";

export interface A2ATaskResult {
  taskId: string;
  agentName: string;
  state: A2ATaskState;
  required: boolean;
  artifact?: {
    verdict: "APPROVE" | "REJECT" | "INFO";
    summary: string;
  };
  error?: string;
  tokensUsed: number;
  costUsd: number;
}

export interface OrchestratorResult {
  status: "COMPLETED" | "ESCALATED" | "BUDGET_EXCEEDED";
  completedSteps: string[];
  pivotsUsed: number;
  budget: BudgetSnapshot;
  escalation?: EscalationPacket;
  a2aSummary?: {
    overallVerdict: "APPROVE" | "REJECT";
    results: A2ATaskResult[];
    warnings: string[];
  };
}
```

### Block-by-block explanation
1. **`PermissionLevel` & `PlanStep`:** Every planned step carries its permission tier and `expectedPostCondition` so the harness enforces boundaries before execution (Chapter 01 & 02).
2. **`LoopBudgetConfig` & `BudgetSnapshot`:** Captures all four loop limits (`maxSteps`, `maxTokens`, `maxCostUsd`, `maxDurationMs`) plus `maxPivots`.
3. **`ToolErrorClass` & `StuckDecision`:** Discriminated union separating `RETRY` (transient), `PIVOT` (structural, with `bannedSignature`), and `ESCALATE` (exhausted pivots).
4. **`AgentCard` & `A2ATaskResult`:** Models the A2A discovery card and stateful task response including `tokensUsed` and `costUsd` for parent budget roll-up (Chapters 06–07).

