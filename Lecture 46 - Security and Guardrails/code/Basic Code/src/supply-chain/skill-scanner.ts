/**
 * Chapter 11 — Skill & MCP Manifest Security Scanner (AI Supply Chain Defence)
 *
 * Scans skill/plugin/MCP manifests against an approved capability registry,
 * flags excessive agency permissions, and detects hidden tool-poisoning /
 * credential-exfiltration payloads.
 */

export interface SkillManifest {
  name: string;
  version: string;
  publisher: string;
  description: string;
  permissions: string[];
  sha256: string;
}

export interface ScanFinding {
  severity: "critical" | "high" | "medium";
  rule: string;
  detail: string;
}

export interface SkillScanReport {
  skill: string;
  approved: boolean;
  findings: ScanFinding[];
}

export const APPROVED_REGISTRY: Record<string, { publisher: string; allowedPermissions: string[] }> = {
  "kb-search-skill": { publisher: "acme-internal", allowedPermissions: ["kb:read"] },
  "ticket-triage-skill": { publisher: "acme-internal", allowedPermissions: ["tickets:read", "tickets:tag"] },
};

const POISON_PATTERNS: { rule: string; regex: RegExp }[] = [
  { rule: "prompt_injection_override", regex: /ignore\s+(all\s+)?(previous|prior)\s+instructions/i },
  { rule: "ssh_or_env_exfiltration", regex: /(~\/\.ssh|id_rsa|\.env|process\.env)/i },
  { rule: "remote_shell_pipe", regex: /(curl|wget)\s+[^\n|]+\|\s*(ba)?sh/i },
  { rule: "hidden_exfil_directive", regex: /(send|forward|exfiltrate|post)\s+.*(secret|token|key|password)/i },
];

const DANGEROUS_PERMISSIONS = new Set(["shell:exec", "network:*", "fs:write:*", "admin:*"]);

export function scanSkillManifest(manifest: SkillManifest): SkillScanReport {
  const findings: ScanFinding[] = [];

  const regEntry = APPROVED_REGISTRY[manifest.name];
  if (!regEntry) {
    findings.push({
      severity: "high",
      rule: "unapproved_capability_registry",
      detail: `Skill '${manifest.name}' is not in the approved capability registry.`,
    });
  } else if (regEntry.publisher !== manifest.publisher) {
    findings.push({
      severity: "critical",
      rule: "publisher_mismatch",
      detail: `Expected publisher '${regEntry.publisher}', got '${manifest.publisher}'.`,
    });
  }

  for (const perm of manifest.permissions) {
    if (DANGEROUS_PERMISSIONS.has(perm)) {
      findings.push({
        severity: "critical",
        rule: "excessive_agency_permission",
        detail: `Dangerous permission requested: '${perm}'.`,
      });
    } else if (regEntry && !regEntry.allowedPermissions.includes(perm)) {
      findings.push({
        severity: "high",
        rule: "undeclared_registry_permission",
        detail: `Permission '${perm}' exceeds approved registry scope.`,
      });
    }
  }

  for (const { rule, regex } of POISON_PATTERNS) {
    if (regex.test(manifest.description)) {
      findings.push({
        severity: "critical",
        rule,
        detail: `Tool/skill description matched poison pattern: ${regex.source}`,
      });
    }
  }

  return {
    skill: manifest.name,
    approved: findings.length === 0,
    findings,
  };
}

