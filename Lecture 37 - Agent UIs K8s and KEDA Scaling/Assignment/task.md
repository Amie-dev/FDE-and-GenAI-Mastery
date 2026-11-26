# 📝 Lecture 37 — Assignment & Release Gate

**Agent-to-User UIs (`AG-UI`, `MCP Apps`), Kubernetes & KEDA Scaling**
Phase 8 · Multimodality, Full-Stack Apps & Agent Scaling · 🔴 Expert · **Estimated effort: 5–7 hours**

> **Read first:** the seven chapters in **[../notes](../notes)** (index: **[../index.md](../index.md)**).
> The lecture's **goal**, **build task**, and **release gate** live in **[../README.md](../README.md)** and **[../../roadmap-v1.md](../../roadmap-v1.md)** → *Lecture 37*.

---

## 🎯 What this assignment tests

| Weight | Part | What it tests | Output |
| :---: | :--- | :--- | :--- |
| **30%** | **A** — Chapter-wise practice | Can you explain `AG-UI`, `MCP Apps`, KEDA scaling, `gVisor`, and OOM/crash recovery | Written answers (`A1`–`A7`) |
| **35%** | **B** — Code, Manifests & Guide | Can you build & walk through `code/Basic Code/` + `k8s/` + `implementations guide/` | `../code/Basic Code` |
| **20%** | **C** — Release Gate Verification | Does KEDA scale `1 -> N` on queue spike & sandbox block host network/FS | `npm test` (5/5 green) |
| **15%** | **D** — Spoken / Written Defense | Can you defend every infrastructure decision in 2–3 sentences | 3 short answers |

---

## Part A — Chapter-wise practice

1. **A1 (Chapter 01):** Contrast raw chatbot SSE vs. `AG-UI` events (`STEP_STARTED`, `APPROVAL_REQUIRED`, `RUN_ERROR`).
2. **A2 (Chapter 02):** Why must an `MCP App` widget run inside a sandboxed `iframe` without `allow-same-origin`?
3. **A3 (Chapter 03):** Name the 4 triggers that justify self-hosted Kubernetes over a managed runtime.
4. **A4 (Chapter 04):** Why do multi-minute agent loops crash or time out inside stateless HTTP handlers, and how do queues + Redis Pub/Sub fix it?
5. **A5 (Chapter 05):** Given `queueDepth = 40`, `targetListLength = 5`, `min = 1`, `max = 20`, compute `desiredReplicas` and explain why CPU HPA fails.
6. **A6 (Chapter 06):** Contrast `runc`, `gVisor`, and `Firecracker` for untrusted LLM code execution.
7. **A7 (Chapter 07):** How do `resources.limits`, `terminationGracePeriodSeconds`, and queue visibility timeouts work together during pod crashes?

---

## Part B — `code/Basic Code/` & `implementations guide/`

Inspect, run, and extend [`../code/Basic Code/`](../code/Basic%20Code/) alongside its chapter-wise [`implementations guide/`](../code/Basic%20Code/implementations%20guide/):

- [ ] Read [`00_Overview_and_File_Structure.md`](../code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) through [`04_Demo_and_Release_Gate_Verification.md`](../code/Basic%20Code/implementations%20guide/04_Demo_and_Release_Gate_Verification.md).
- [ ] Inspect [`k8s/worker-deployment.yaml`](../code/Basic%20Code/k8s/worker-deployment.yaml) and [`k8s/keda-scaledobject.yaml`](../code/Basic%20Code/k8s/keda-scaledobject.yaml).
- [ ] Verify `runIsolatedCode()` blocks `import socket` and `open('/etc/passwd')` while executing safe math.

---

## Part C — Release Gate Commands (`code/Basic Code/`)

Run inside `Lecture 37 - Agent UIs K8s and KEDA Scaling/code/Basic Code/`:

```bash
npm install
npm run typecheck
npm start
npm test
```

### Passing Criteria (Release Gate)

All of the following must exit with code `0`:

- [ ] `npm run typecheck` — zero TypeScript errors (`tsc --noEmit`).
- [ ] `npm start` — streams `AG-UI` events, builds `MCP App` widget, simulates KEDA scale-out, audits K8s/KEDA manifests, and tests the isolated code runner.
- [ ] `npm test` — all 5 automated release-gate tests in `src/release-gate.test.ts` pass:
  1. Queue spike triggers KEDA scale-out (`0 -> 1`, `40 -> 8`, `250 -> 20`).
  2. Kubernetes Deployment & KEDA `ScaledObject` pass `gVisor` and resource-limit audit.
  3. Untrusted Python snippet cannot access host network (`socket`) or filesystem (`open`).
  4. `AG-UI` SSE stream emits valid `APPROVAL_REQUIRED` events.
  5. `MCP App` widget attaches `ui://` resource and strict `allow-scripts` sandbox policy.

---

## Part D — Spoken / Written Defense

Be ready to answer in 2–3 sentences each:
1. Why does KEDA scale agent workers on Redis `listLength` instead of CPU utilization?
2. How does separating Stateless API Ingress from Durable Worker Pods survive rolling Kubernetes deployments?
3. Why is `runtimeClassName: gvisor` paired with `readOnlyRootFilesystem: true` and `capabilities.drop: ["ALL"]`?

