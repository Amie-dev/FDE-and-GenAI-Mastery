# Chapter 02: Kubernetes Deployment, KEDA ScaledObject & Scaler

> **Chapter goal:** author `k8s/worker-deployment.yaml`, `k8s/keda-scaledobject.yaml`, and `src/keda-scaler.ts`.
> **Notes chapters covered:** 05 (KEDA Autoscaling), 06 (`gVisor` Isolation), & 07 (Resource Limits & Crash Recovery).

---

## 2.1 Full code: `k8s/worker-deployment.yaml` & `k8s/keda-scaledobject.yaml`

File path: `code/Basic Code/k8s/worker-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-worker
  labels:
    app: agent-worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: agent-worker
  template:
    metadata:
      labels:
        app: agent-worker
    spec:
      runtimeClassName: gvisor
      terminationGracePeriodSeconds: 60
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: worker
          image: ghcr.io/acme/agent-worker:1.0.0
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          env:
            - name: REDIS_QUEUE_NAME
              value: "agent_jobs"
```

File path: `code/Basic Code/k8s/keda-scaledobject.yaml`

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: agent-worker-scaler
spec:
  scaleTargetRef:
    name: agent-worker
  pollingInterval: 15
  cooldownPeriod: 60
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
    - type: redis
      metadata:
        address: redis-master.default.svc.cluster.local:6379
        listName: agent_jobs
        listLength: "5"
```

---

## 2.2 Full code: `src/keda-scaler.ts`

File path: `code/Basic Code/src/keda-scaler.ts`

```ts
import { readFileSync } from "node:fs";

export interface KedaScalingConfig {
  minReplicaCount: number;
  maxReplicaCount: number;
  targetListLength: number;
}

/**
 * Computes KEDA desired worker pod replicas from queue depth:
 * desired = clamp(ceil(queueDepth / targetListLength), minReplicaCount, maxReplicaCount)
 */
export function computeKedaDesiredReplicas(queueDepth: number, config: KedaScalingConfig): number {
  const raw = Math.ceil(queueDepth / Math.max(1, config.targetListLength));
  return Math.max(config.minReplicaCount, Math.min(config.maxReplicaCount, raw));
}

export interface ManifestAuditResult {
  valid: boolean;
  errors: string[];
}

/** Validates required production invariants in worker-deployment.yaml and keda-scaledobject.yaml. */
export function validateK8sAndKedaManifests(deploymentPath: string, kedaPath: string): ManifestAuditResult {
  const errors: string[] = [];
  const dep = readFileSync(deploymentPath, "utf-8");
  const keda = readFileSync(kedaPath, "utf-8");

  if (!dep.includes("runtimeClassName: gvisor")) errors.push("Missing runtimeClassName: gvisor");
  if (!dep.includes("runAsNonRoot: true")) errors.push("Missing runAsNonRoot: true");
  if (!dep.includes("readOnlyRootFilesystem: true")) errors.push("Missing readOnlyRootFilesystem: true");
  if (!dep.includes("limits:")) errors.push("Missing container resource limits");
  if (!dep.includes("terminationGracePeriodSeconds:")) errors.push("Missing terminationGracePeriodSeconds");

  if (!keda.includes("kind: ScaledObject")) errors.push("Missing KEDA ScaledObject kind");
  if (!keda.includes("listLength:")) errors.push("Missing KEDA Redis listLength trigger");
  if (!keda.includes("maxReplicaCount:")) errors.push("Missing KEDA maxReplicaCount cap");

  return { valid: errors.length === 0, errors };
}
```

### Explanation
- **`worker-deployment.yaml`:** Enforces `runtimeClassName: gvisor`, non-root user, read-only root filesystem, `1Gi` memory limit, and `60s` graceful shutdown.
- **`keda-scaledobject.yaml`:** Scales `agent-worker` from `1` to `20` replicas targeting `5` queued Redis jobs per pod.
- **`validateK8sAndKedaManifests()`:** Programmatically audits both YAML files in CI so security or scaling invariants cannot be accidentally deleted.

