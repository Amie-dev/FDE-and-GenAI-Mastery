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

