# Chapter 02: Isolated Sandbox Executor

> **Chapter goal:** implement `IsolatedSandboxExecutor` (`src/executor.ts`) mirroring Cloudflare's `DynamicWorkerExecutor` with `globalOutbound: null` and zero secret access.
> **Notes chapter covered:** 05 (Dynamic Workers & Sandbox Isolation).

---

## 2.1 Full code: `src/executor.ts`

File path: `code/Basic Code/src/executor.ts`

```ts
import vm from "node:vm";

export interface SandboxExecutionResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Local V8/vm isolate simulator mirroring Cloudflare DynamicWorkerExecutor:
 * - globalOutbound: null -> raw fetch() / network is blocked inside the sandbox
 * - Zero process/env/secret access inside the isolate
 * - Host-side RPC bindings (`codemode` or `request`) execute outside the sandbox
 */
export class IsolatedSandboxExecutor {
  async execute(params: {
    code: string;
    bindings: Record<string, unknown>;
    timeoutMs?: number;
  }): Promise<SandboxExecutionResult> {
    const context = vm.createContext({
      ...params.bindings,
      // Explicitly block ambient network & process secrets
      fetch: () => {
        throw new Error("SandboxSecurityError: globalOutbound is null; raw fetch() is disabled");
      },
      process: undefined,
      globalThis: undefined,
    });

    const wrapped = `(async () => {\n${params.code}\n})()`;

    try {
      const script = new vm.Script(wrapped);
      const promise = script.runInContext(context, { timeout: params.timeoutMs ?? 1500 }) as Promise<unknown>;
      const rawResult = await promise;
      const result = rawResult === undefined ? undefined : JSON.parse(JSON.stringify(rawResult));
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
```

### Block-by-block explanation
1. **`vm.createContext()`:** Creates an isolated V8 context containing *only* the host-provided RPC bindings (`codemode` or `request`), explicitly setting `process: undefined` and overriding `fetch()` to throw `SandboxSecurityError`.
2. **`timeoutMs`:** Prevents infinite `while (true)` loops inside generated code from hanging the host.
