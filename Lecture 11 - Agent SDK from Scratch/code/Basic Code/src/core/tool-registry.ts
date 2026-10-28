import { ITool, ToolResult } from '../types/types';

/**
 * ToolRegistry - stores and dispatches tool execution.
 * Based on Chapter 4 (Tool Execution Engine & Registry).
 *
 * Uses toolMap (Map<string, ITool>) for O(1) lookup by tool name.
 */

export class ToolRegistry {
  private tools = new Map<string, ITool>();

  /** Register a tool into the registry (adds to toolMap) */
  register(tool: ITool): void {
    this.tools.set(tool.name, tool);
  }

  /** Register multiple tools at once */
  registerMany(tools: ITool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /** Get a tool by name */
  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /** List all registered tool names */
  list(): string[] {
    return Array.from(this.tools.keys());
  }

  /** Execute a tool by name with given args */
  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.get(name);
    if (!tool) {
      return { content: `Error: Tool '${name}' not found` };
    }
    try {
      return await tool.execute(args);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { content: `Error executing tool '${name}': ${errorMessage}` };
    }
  }
}
