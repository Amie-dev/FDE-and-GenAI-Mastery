/**
 * Chapter 11 — AI Bill of Materials (AI BOM / CycloneDX 1.5 ML-BOM) Generator & Verifier
 *
 * Emits a verifiable CycloneDX-compatible ML-BOM covering models, datasets,
 * MCP servers/skills, and guardrail policies for CI/CD release gates.
 */

import { createHash } from "node:crypto";

export interface AiBomArtifact {
  type: "machine-learning-model" | "data" | "application";
  name: string;
  version: string;
  supplier: string;
  license: string;
  sha256?: string;
  properties?: Record<string, string>;
}

export interface CycloneDxAiBom {
  bomFormat: "CycloneDX";
  specVersion: "1.5";
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    component: { name: string; version: string; type: "application" };
  };
  components: Array<{
    type: AiBomArtifact["type"];
    name: string;
    version: string;
    supplier: { name: string };
    licenses: Array<{ license: { id: string } }>;
    hashes: Array<{ alg: "SHA-256"; content: string }>;
    properties: Array<{ name: string; value: string }>;
  }>;
}

export function computeDigest(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

export function generateAiBom(
  appName: string,
  appVersion: string,
  artifacts: AiBomArtifact[]
): CycloneDxAiBom {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${computeDigest(`${appName}@${appVersion}`).slice(0, 32)}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      component: { name: appName, version: appVersion, type: "application" },
    },
    components: artifacts.map((a) => ({
      type: a.type,
      name: a.name,
      version: a.version,
      supplier: { name: a.supplier },
      licenses: [{ license: { id: a.license } }],
      hashes: [{ alg: "SHA-256", content: a.sha256 ?? computeDigest(`${a.name}@${a.version}`) }],
      properties: Object.entries(a.properties ?? {}).map(([name, value]) => ({ name, value })),
    })),
  };
}

export function verifyAiBom(bom: CycloneDxAiBom): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (bom.bomFormat !== "CycloneDX" || bom.specVersion !== "1.5") {
    errors.push("Invalid CycloneDX ML-BOM header");
  }
  if (bom.components.length === 0) {
    errors.push("AI BOM must contain at least one component");
  }
  for (const c of bom.components) {
    if (!c.hashes.some((h) => h.alg === "SHA-256" && h.content.length === 64)) {
      errors.push(`Component '${c.name}' is missing a valid SHA-256 hash`);
    }
    if (!c.licenses.length) {
      errors.push(`Component '${c.name}' is missing license metadata`);
    }
  }
  return { valid: errors.length === 0, errors };
}

