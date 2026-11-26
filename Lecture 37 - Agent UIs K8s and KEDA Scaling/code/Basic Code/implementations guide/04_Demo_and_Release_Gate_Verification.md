# Chapter 04: End-to-End Demo & Release Gate Tests

> **Chapter goal:** run the demo (`src/index.ts`) and verify all 5 release gates (`src/release-gate.test.ts`).
> **Notes chapters covered:** 01–07.

---

## 4.1 Full code: `src/index.ts` & `src/release-gate.test.ts`

File path: `code/Basic Code/src/index.ts`

```ts
import { resolve } from "node:path";
import { AgUiEventStream, createMcpAppWidget } from "./ag-ui.js";
import { computeKedaDesiredReplicas, validateK8sAndKedaManifests } from "./keda-scaler.js";
import { runIsolatedCode } from "./sandbox-runner.js";

function main(): void {
  console.log("=== 1. AG-UI Event Stream & MCP App Widget ===");
  const stream = new AgUiEventStream("run_901");
  process.stdout.write(stream.emit("RUN_STARTED", { goal: "Compute Q3 cohort retention" }));
  process.stdout.write(stream.emit("STEP_STARTED", { step: "Running isolated Python sandbox" }));
  process.stdout.write(stream.emit("APPROVAL_REQUIRED", { approvalId: "apr_44", action: "publish_report" }));
  console.log("MCP App Widget:", createMcpAppWidget("3 pending refunds ready for review", "ui://refunds/panel"));

  console.log("\n=== 2. KEDA Queue-Spike Autoscaling & Manifest Audit ===");
  const kedaConfig = { minReplicaCount: 1, maxReplicaCount: 20, targetListLength: 5 };
  console.log("Queue=0 -> pods:", computeKedaDesiredReplicas(0, kedaConfig));
  console.log("Queue=40 -> pods:", computeKedaDesiredReplicas(40, kedaConfig));
  console.log("Queue=250 (clamped) -> pods:", computeKedaDesiredReplicas(250, kedaConfig));

  const audit = validateK8sAndKedaManifests(
    resolve("k8s/worker-deployment.yaml"),
    resolve("k8s/keda-scaledobject.yaml")
  );
  console.log("K8s/KEDA Manifest Audit:", audit);

  console.log("\n=== 3. Isolated Code Runner ===");
  console.log("Blocked network attempt:", runIsolatedCode("import socket\nprint(socket.gethostname())"));
  console.log("Safe math execution:", runIsolatedCode("import statistics\nprint(statistics.mean([10, 20, 30]))"));
}

main();
```

File path: `code/Basic Code/src/release-gate.test.ts`

```ts
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { AgUiEventStream, createMcpAppWidget } from "./ag-ui.js";
import { computeKedaDesiredReplicas, validateK8sAndKedaManifests } from "./keda-scaler.js";
import { runIsolatedCode } from "./sandbox-runner.js";

describe("Lecture 37 Release Gate", () => {
  it("Gate 1: Queue spike triggers KEDA scale-out from 1 to N worker pods within maxReplicaCount", () => {
    const cfg = { minReplicaCount: 1, maxReplicaCount: 20, targetListLength: 5 };
    assert.equal(computeKedaDesiredReplicas(0, cfg), 1);
    assert.equal(computeKedaDesiredReplicas(40, cfg), 8);
    assert.equal(computeKedaDesiredReplicas(250, cfg), 20);
  });

  it("Gate 2: Kubernetes Deployment & KEDA ScaledObject manifests pass gVisor and resource-limit audit", () => {
    const audit = validateK8sAndKedaManifests(
      resolve("k8s/worker-deployment.yaml"),
      resolve("k8s/keda-scaledobject.yaml")
    );
    assert.equal(audit.valid, true, `Manifest errors: ${audit.errors.join(", ")}`);
  });

  it("Gate 3: Untrusted Python snippet cannot access host network or filesystem", () => {
    const netAttempt = runIsolatedCode("import socket\nsocket.create_connection(('169.254.169.254', 80))");
    assert.equal(netAttempt.ok, false);
    assert.ok(netAttempt.error?.includes("SandboxSecurityError"));

    const fsAttempt = runIsolatedCode("print(open('/etc/passwd').read())");
    assert.equal(fsAttempt.ok, false);
    assert.ok(fsAttempt.error?.includes("SandboxSecurityError"));

    const safe = runIsolatedCode("import math\nprint(math.factorial(5))");
    assert.equal(safe.ok, true);
    assert.equal(safe.output, "120");
  });

  it("Gate 4: AG-UI SSE stream emits valid lifecycle events including APPROVAL_REQUIRED", () => {
    const stream = new AgUiEventStream("run_1");
    const sse = stream.emit("APPROVAL_REQUIRED", { approvalId: "apr_1", amountUsd: 250 });
    assert.ok(sse.startsWith("event: APPROVAL_REQUIRED\ndata: "));
    assert.equal(stream.getEvents().length, 1);
  });

  it("Gate 5: MCP App widget attaches ui:// resource and strict allow-scripts sandbox policy", () => {
    const widget = createMcpAppWidget("Ready", "ui://refunds/panel");
    assert.equal(widget._meta.uiResourceUri, "ui://refunds/panel");
    assert.equal(widget._meta.sandboxPolicy, "allow-scripts");
  });
});
```

### Verification Commands

```bash
npm install
npm run typecheck
npm start
npm test
```

