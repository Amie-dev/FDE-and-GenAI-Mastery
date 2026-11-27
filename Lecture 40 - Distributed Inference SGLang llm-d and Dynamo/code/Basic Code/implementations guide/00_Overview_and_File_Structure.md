# Chapter 00: Overview, Architecture & File Structure

> **Chapter goal:** understand *what* this codebase is, how capacity sizing compares Monolithic vs. Disaggregated `P/D` serving, and how fail-closed residency + prefix-affinity routing work.

---

## 0.1 File Structure

| File | Responsibility | Notes Chapter |
| :--- | :--- | :---: |
| `package.json` & `tsconfig.json` | ESM + strict TypeScript setup (`tsx`, `@types/node`) | — |
| `src/types.ts` | Shared contracts for workloads, GPU specs, residency regions, and routing decisions | 01–07 |
| `src/simulator.ts` | TTFT/TPOT/GPU capacity model comparing Monolithic vs. Disaggregated `P/D` | 01, 02, 07 |
| `src/router.ts` | `DistributedInferenceRouter` enforcing fail-closed residency + prefix-affinity scoring | 04, 06 |
| `src/index.ts` | Runnable end-to-end demo | 01–07 |
| `src/release-gate.test.ts` | 4 automated release-gate suites (`node:test`) | All |

---

## 0.2 Commands

```bash
cd "Lecture 40 - Distributed Inference SGLang llm-d and Dynamo/code/Basic Code"
npm install
npm run typecheck
npm start
npm test
```

