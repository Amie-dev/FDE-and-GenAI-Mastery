# Chapter 00: Overview, Architecture & File Structure

> **Chapter goal:** understand *what* this codebase is, how `AG-UI` streaming, KEDA autoscaling, Kubernetes `gVisor` manifests, and isolated code execution fit together.

---

## 0.1 What this codebase is

This is the **minimum working TypeScript + Kubernetes/KEDA starter** proving Lecture 37:
- Implements `AG-UI` SSE streaming & `MCP Apps` widget metadata.
- Ships production-hardened Kubernetes `Deployment` (`gVisor`) and KEDA `ScaledObject` YAML manifests, plus a TypeScript manifest auditor and isolated `python3 -I` sandbox runner.

| File | Responsibility | Notes Chapter |
| :--- | :--- | :---: |
| `package.json` & `tsconfig.json` | ESM + strict TypeScript setup (`tsx`, `@types/node`) | — |
| `k8s/worker-deployment.yaml` | Hardened `gVisor` worker pod Deployment with resource limits & `SIGTERM` grace | 06, 07 |
| `k8s/keda-scaledobject.yaml` | KEDA `ScaledObject` scaling `1 -> 20` pods on Redis `listLength: "5"` | 05 |
| `src/ag-ui.ts` | `AgUiEventStream` SSE emitter & `createMcpAppWidget()` builder | 01, 02 |
| `src/keda-scaler.ts` | KEDA replica formula & YAML manifest auditor | 05, 06, 07 |
| `src/sandbox-runner.ts` | Isolated `python3 -I` runner blocking host network & filesystem | 06 |
| `src/index.ts` | Runnable end-to-end demo | 01–07 |
| `src/release-gate.test.ts` | 5 automated release-gate assertions (`node:test`) | All |

---

## 0.2 Commands

```bash
cd "Lecture 37 - Agent UIs K8s and KEDA Scaling/code/Basic Code"
npm install
npm run typecheck
npm start
npm test
```

