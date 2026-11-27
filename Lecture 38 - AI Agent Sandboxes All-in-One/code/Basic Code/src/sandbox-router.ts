export type SandboxPlatform =
  | 'cloudflare-dynamic-workers'
  | 'cloudflare-sandbox-ga'
  | 'e2b-firecracker'
  | 'modal-sandboxes'
  | 'daytona'
  | 'docker-ai-sandboxes'
  | 'aio-sandbox';

export interface WorkloadSpec {
  language: 'js-ts' | 'python-bash' | 'docker-in-docker' | 'browser-and-shell';
  needsGpu?: boolean;
  needsPersistentGitWorkspace?: boolean;
  needsSub10msBoot?: boolean;
  localDeveloperMachine?: boolean;
}

export function routeSandboxPlatform(spec: WorkloadSpec): {
  platform: SandboxPlatform;
  topology: 'sandbox-as-a-tool' | 'agent-in-sandbox';
  isolation: 'v8-isolate' | 'gvisor-or-container' | 'microvm';
} {
  if (spec.language === 'js-ts' && spec.needsSub10msBoot) {
    return {
      platform: 'cloudflare-dynamic-workers',
      topology: 'sandbox-as-a-tool',
      isolation: 'v8-isolate',
    };
  }
  if (spec.language === 'browser-and-shell') {
    return {
      platform: 'aio-sandbox',
      topology: 'sandbox-as-a-tool',
      isolation: 'gvisor-or-container',
    };
  }
  if (spec.language === 'docker-in-docker' && spec.localDeveloperMachine) {
    return {
      platform: 'docker-ai-sandboxes',
      topology: 'agent-in-sandbox',
      isolation: 'microvm',
    };
  }
  if (spec.needsGpu) {
    return {
      platform: 'modal-sandboxes',
      topology: 'sandbox-as-a-tool',
      isolation: 'gvisor-or-container',
    };
  }
  if (spec.needsPersistentGitWorkspace) {
    return {
      platform: 'daytona',
      topology: 'agent-in-sandbox',
      isolation: 'microvm',
    };
  }
  return {
    platform: spec.language === 'python-bash' ? 'e2b-firecracker' : 'cloudflare-sandbox-ga',
    topology: 'sandbox-as-a-tool',
    isolation: 'microvm',
  };
}

const BLOCKED_HOSTS = ['169.254.169.254', 'metadata.google.internal', 'localhost', '127.0.0.1'];

export function validateSandboxEgress(targetUrl: string, allowList: string[]): { allowed: boolean; reason?: string } {
  const url = new URL(targetUrl);
  if (BLOCKED_HOSTS.includes(url.hostname) || url.hostname.startsWith('10.') || url.hostname.startsWith('192.168.')) {
    return { allowed: false, reason: `Blocked metadata/private host: ${url.hostname}` };
  }
  if (!allowList.includes(url.hostname)) {
    return { allowed: false, reason: `Host ${url.hostname} not in egress allow-list` };
  }
  return { allowed: true };
}

