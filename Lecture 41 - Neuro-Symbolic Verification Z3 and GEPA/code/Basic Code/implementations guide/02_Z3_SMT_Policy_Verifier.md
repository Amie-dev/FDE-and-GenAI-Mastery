# Chapter 02: Z3 SMT Solver Policy Verifier

> **Chapter goal:** implement `verifyPlanWithZ3()` (`src/z3-verifier.ts`) using `z3-solver`.
> **Notes chapters covered:** 04 (Neuro-Symbolic Verification) & 05 (Z3 SMT Solver Constraints).

---

## 2.1 Full code: `src/z3-verifier.ts`

File path: `code/Basic Code/src/z3-verifier.ts`

```ts
import { init } from "z3-solver";
import type { AgentActionPlan, Z3VerificationResult } from "./types.js";

let z3ContextPromise: ReturnType<typeof init> | undefined;

async function getZ3() {
  if (!z3ContextPromise) {
    z3ContextPromise = init();
  }
  return z3ContextPromise;
}

/**
 * Z3 SMT Solver Policy Verifier:
 * Encodes business invariants as formal SMT constraints and proves SAT / UNSAT
 * before any tool in the candidate action plan is allowed to execute.
 */
export async function verifyPlanWithZ3(plan: AgentActionPlan): Promise<Z3VerificationResult> {
  const { Context } = await getZ3();
  const Z3 = Context("main");

  const tools = plan.steps.map((s) => s.tool);
  const verifyIdxVal = tools.indexOf("verifyPolicy");
  const refundIdxVal = tools.indexOf("refundOrder");
  const totalRefundVal = plan.steps
    .filter((s) => s.tool === "refundOrder")
    .reduce((sum, s) => sum + (s.amountUsd ?? 0), 0);

  const checkConstraint = async (buildAssertion: (solver: InstanceType<typeof Z3.Solver>) => void): Promise<boolean> => {
    const solver = new Z3.Solver();
    buildAssertion(solver);
    const res = await solver.check();
    return res === "sat";
  };

  const violatedPolicies: string[] = [];

  // Policy 1: If refundOrder is present, verifyPolicy must exist and precede it
  const p1Sat = await checkConstraint((s) => {
    const hasRefund = Z3.Bool.val(refundIdxVal !== -1);
    const hasVerify = Z3.Bool.val(verifyIdxVal !== -1);
    const verifyIdx = Z3.Int.val(verifyIdxVal);
    const refundIdx = Z3.Int.val(refundIdxVal);
    s.add(Z3.Implies(hasRefund, Z3.And(hasVerify, verifyIdx.lt(refundIdx))));
  });
  if (!p1Sat) violatedPolicies.push("PreconditionViolation: verifyPolicy must run before refundOrder");

  // Policy 2: Cumulative refund amount must be in [0, 100]
  const p2Sat = await checkConstraint((s) => {
    const total = Z3.Int.val(Math.round(totalRefundVal));
    s.add(total.ge(0));
    s.add(total.le(100));
  });
  if (!p2Sat) violatedPolicies.push(`BudgetViolation: cumulative refund $${totalRefundVal} outside [0, 100]`);

  // Policy 3: Any refund > $50 requires HITL approval
  const p3Sat = await checkConstraint((s) => {
    const total = Z3.Int.val(Math.round(totalRefundVal));
    const approved = Z3.Bool.val(plan.hasHitlApproval);
    s.add(Z3.Implies(total.gt(50), approved));
  });
  if (!p3Sat) violatedPolicies.push(`HitlViolation: refund $${totalRefundVal} > $50 requires hasHitlApproval`);

  return {
    sat: violatedPolicies.length === 0,
    violatedPolicies,
  };
}
```

### Block-by-block explanation
1. **Singleton WASM Init (`getZ3()`):** Initializes the `z3-solver` WebAssembly runtime once and reuses it across all checks.
2. **Three Independent Policy Checks:** Checks each invariant in its own `Z3.Solver()` so when a plan is `UNSAT`, the verifier reports the **exact violated policy names** (`PreconditionViolation`, `BudgetViolation`, `HitlViolation`) back to the planner or GEPA optimizer.

