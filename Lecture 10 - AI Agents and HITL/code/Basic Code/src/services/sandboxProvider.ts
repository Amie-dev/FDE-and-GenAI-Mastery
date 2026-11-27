/**
 * Lecture 10 — SandboxProvider Abstraction Demo
 *
 * Demonstrates the "Sandbox-as-a-Tool" provider interface (inspired by OpenAI Agents SDK
 * Sandboxes and LangChain's sandbox selection taxonomy) so an agent can swap between
 * local Docker AI Sandboxes, Cloudflare Sandbox / Dynamic Workers, and MicroVMs (E2B)
 * without changing agent tool schemas.
 */

export type SandboxTopology = 'sandbox-as-a-tool' | 'agent-in-sandbox';

export type SandboxBackend =
  | 'v8-isolate'        // e.g. Cloudflare Dynamic Workers (~2-5ms, JS/TS only)
  | 'linux-container'   // e.g. Cloudflare Sandbox SDK GA / Modal / AIO Sandbox
  | 'microvm';          // e.g. E2B Firecracker / Docker AI Sandboxes

export interface SandboxPolicy {
  allowNetworkEgress: boolean;
  allowedHosts?: string[];
  maxMemoryMb: number;
  maxTimeoutMs: number;
  injectSecretsViaHostProxy: boolean;
}

export interface SandboxExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  backend: SandboxBackend;
}

export interface SandboxProvider {
  readonly name: string;
  readonly backend: SandboxBackend;
  readonly topology: SandboxTopology;
  exec(command: string, policy: SandboxPolicy): Promise<SandboxExecResult>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  snapshot(label: string): Promise<string>;
}

export interface SandboxSelectionInput {
  language: 'js-ts' | 'python-bash' | 'docker-in-docker' | 'browser-and-shell';
  untrustedCode: boolean;
  requiresPersistentDisk: boolean;
  maxAcceptableColdStartMs: number;
}

/**
 * Deterministic sandbox router implementing the 4-question selection checklist.
 */
export function selectSandboxBackend(input: SandboxSelectionInput): {
  backend: SandboxBackend;
  recommendedPlatform: string;
  reason: string;
} {
  if (input.language === 'js-ts' && !input.requiresPersistentDisk && input.maxAcceptableColdStartMs < 50) {
    return {
      backend: 'v8-isolate',
      recommendedPlatform: 'Cloudflare Dynamic Workers',
      reason: 'Sub-5ms V8 isolate boot with globalOutbound: null and host RPC proxy.',
    };
  }

  if (input.language === 'docker-in-docker') {
    return {
      backend: 'microvm',
      recommendedPlatform: 'Docker AI Sandboxes',
      reason: 'Dedicated microVM per workspace with private Docker daemon and host credential proxy.',
    };
  }

  if (input.language === 'browser-and-shell') {
    return {
      backend: 'linux-container',
      recommendedPlatform: 'AIO Sandbox (agent-infra/sandbox)',
      reason: 'Unified Browser (CDP/Playwright) + Shell + Filesystem + VNC over MCP.',
    };
  }

  if (input.untrustedCode) {
    return {
      backend: 'microvm',
      recommendedPlatform: 'E2B (Firecracker) or Kata/Firecracker K8s',
      reason: 'Hardware-virtualized microVM boundary prevents host kernel escape.',
    };
  }

  return {
    backend: 'linux-container',
    recommendedPlatform: 'Cloudflare Sandbox SDK (GA) / Modal / Daytona',
    reason: 'Persistent Linux container with sleep/wake lifecycle and full OS tooling.',
  };
}

