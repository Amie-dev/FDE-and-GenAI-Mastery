# Chapter 04 — Safe Tool Service

## 4.1 `src/services/tool.service.ts`

**File details:** Implements the safe tool execution layer from Lecture 31 notes (Ch. 05 & Ch. 06). The model only *proposes* a tool; this service *executes* it only after validation.

**Command:** none (instantiated in `src/controllers/chat.controller.ts`).

**Full code:**
```typescript
export class ToolService {
  private tools = new Map<
    string,
    (args: Record<string, unknown>, userId: string) => unknown
  >();

  register(
    name: string,
    fn: (args: Record<string, unknown>, userId: string) => unknown
  ) {
    this.tools.set(name, fn);
  }

  execute(name: string, args: Record<string, unknown>, userId: string) {
    // Fail closed: tool must exist before anything runs
    if (!this.tools.has(name)) {
      throw new Error(`Tool '${name}' is not allowed`);
    }

    // Argument validation: never trust model-supplied arguments
    if (!this.validateArgs(args)) {
      throw new Error('Invalid tool arguments');
    }

    return this.tools.get(name)!(args, userId);
  }

  private validateArgs(args: Record<string, unknown>): boolean {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return false;
    }
    for (const key of Object.keys(args)) {
      if (key.includes('__proto__') || key.includes('constructor')) {
        return false;
      }
    }
    return true;
  }
}
```

**Block-by-block explanation:**
- `private tools` — a map of registered tool names to handler functions. Only tools explicitly registered here can ever run (least privilege).
- `register(name, fn)` — adds a narrow, typed tool. The handler receives `args` and `userId`.
- `execute(name, args, userId)` — the security seam:
  1. **Fail closed:** if `name` is not registered, throw. The model cannot call a tool that was never exposed (Ch. 05 — "the model cannot execute a capability because it was never exposed").
  2. **Argument validation:** model-supplied args are treated like untrusted HTTP request parameters (Ch. 06 — "Never Trust Tool Arguments"). `validateArgs` rejects non-objects and prototype-pollution keys.
  3. Only then does the handler run, receiving `userId` from the session, not from the model.
- `validateArgs` — returns `false` for null/non-object/array args, and for dangerous keys like `__proto__` or `constructor`.

**Why this matches the notes:**
- Ch. 05: LLM proposes, backend executes; least privilege; router/model gets no tools here.
- Ch. 06: validate arguments shape → format → range → ownership; identity from session, never a model argument.
- Ch. 07: this is the strongest practical layer — tool/action guardrails closest to the asset.
