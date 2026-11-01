/**
 * Safe Tool Service (Lecture 31 — Ch. 05 & Ch. 06)
 *
 * Security rules implemented here:
 * 1. The model only PROPOSES a tool; the backend EXECUTES it.
 * 2. Least privilege — only registered, narrow tools can run.
 * 3. Fail closed — an unknown tool is rejected.
 * 4. Argument validation — model args are treated like untrusted HTTP params.
 * 5. Identity comes from the session (userId), never from a model argument.
 */
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
      // Block prototype pollution keys
      if (key.includes('__proto__') || key.includes('constructor')) {
        return false;
      }
    }
    return true;
  }
}