# Chapter 00: Overview, Architecture & File Structure

> **Chapter goal:** understand *what* this codebase is, how `z3-solver` verifies candidate action plans pre-execution, and how Trajectory Evals + GEPA optimize planner prompts.

---

## 0.1 File Structure

| File | Responsibility | Notes Chapter |
| :--- | :--- | :---: |
| `package.json` & `tsconfig.json` | ESM + strict TypeScript + `z3-solver` + `tsx` | — |
| `src/types.ts` | Shared contracts for action plans, trajectory scores, Z3 results, and GEPA reports | 01–07 |
| `src/trajectory-eval.ts` | `scoreTrajectory()` grading recall, precondition order, arg accuracy, and efficiency | 01, 02 |
| `src/z3-verifier.ts` | Real `z3-solver` SMT verifier encoding ordering, `$100` budget, and `$50` HITL rules | 04, 05 |
| `src/gepa.ts` | Reflective GEPA prompt optimizer mutating prompts from Z3/trajectory failure traces | 06 |
| `src/index.ts` | Runnable end-to-end demo | 01–07 |
| `src/release-gate.test.ts` | 4 automated release-gate suites (including 50-case property-based invariant test) | All |

---

## 0.2 Commands

```bash
cd "Lecture 41 - Neuro-Symbolic Verification Z3 and GEPA/code/Basic Code"
npm install
npm run typecheck
npm start
npm test
```

