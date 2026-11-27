/**
 * Lecture 31 — Cloudflare Sandbox SDK (GA) vs. Dynamic Workers Pattern
 *
 * Mirrors the stable `@cloudflare/sandbox` + OpenAI Agents SDK integration pattern:
 *   import { getSandbox, Sandbox } from "@cloudflare/sandbox";
 *   export { Sandbox };
 *   const sandbox = getSandbox(env.Sandbox, threadId);
 *   const res = await sandbox.exec('python3 -c "print(2 + 2)"');
 *
 * Implemented with typed interfaces so it typechecks cleanly offline without
 * requiring a live Cloudflare Workers account.
 */

export interface CloudflareSandboxExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface CloudflareSandboxClient {
  exec(command: string): Promise<CloudflareSandboxExecResult>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<{ content: string }>;
}

/**
 * Wraps a Cloudflare Sandbox instance as an OpenAI Agents SDK shell/workspace tool.
 */
export function createOpenAiSandboxTool(
  getSandboxForThread: (threadId: string) => CloudflareSandboxClient,
) {
  return {
    name: 'run_in_cloudflare_sandbox',
    description: 'Execute bash/python/git commands inside an isolated Linux container backed by Durable Objects.',
    async execute(args: { threadId: string; command: string }): Promise<CloudflareSandboxExecResult> {
      const sandbox = getSandboxForThread(args.threadId);
      return sandbox.exec(args.command);
    },
  };
}

export function chooseCloudflareRuntime(needsLinuxBinariesOrGit: boolean): 'cloudflare-sandbox-ga' | 'dynamic-workers' {
  return needsLinuxBinariesOrGit ? 'cloudflare-sandbox-ga' : 'dynamic-workers';
}

