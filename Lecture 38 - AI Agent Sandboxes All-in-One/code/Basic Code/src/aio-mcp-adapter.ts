/**
 * Simulates an All-in-One (AIO) Sandbox (agent-infra/sandbox pattern) where
 * Browser (CDP/Playwright), Shell, and Filesystem share one /workspace over MCP.
 */
export class AioSandboxSession {
  private readonly workspaceFiles = new Map<string, string>();
  private readonly hostSecrets = new Map<string, string>([['OPENAI_API_KEY', 'sk-host-only-secret']]);

  async browserDownload(filename: string, content: string): Promise<{ path: string; bytes: number }> {
    const fullPath = `/workspace/${filename}`;
    this.workspaceFiles.set(fullPath, content);
    return { path: fullPath, bytes: content.length };
  }

  async shellExec(command: string): Promise<{ stdout: string; exitCode: number }> {
    if (command.includes('printenv') || command.includes('OPENAI_API_KEY')) {
      return { stdout: '[REDACTED: secrets live in host proxy, not sandbox env]', exitCode: 0 };
    }
    if (command.startsWith('wc -l ')) {
      const target = command.replace('wc -l ', '').trim();
      const body = this.workspaceFiles.get(target);
      if (!body) return { stdout: `No such file: ${target}`, exitCode: 1 };
      return { stdout: `${body.split('\n').length} ${target}`, exitCode: 0 };
    }
    return { stdout: `executed: ${command}`, exitCode: 0 };
  }

  hasHostSecretLeakedToSandbox(envDump: string): boolean {
    for (const secret of this.hostSecrets.values()) {
      if (envDump.includes(secret)) return true;
    }
    return false;
  }
}

