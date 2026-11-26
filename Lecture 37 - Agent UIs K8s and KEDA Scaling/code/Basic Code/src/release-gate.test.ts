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

