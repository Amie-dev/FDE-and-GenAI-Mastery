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

