import { ITool, ToolResult } from '../types/types';

/**
 * ToolRegistry - stores and dispatches tool execution.
 * Based on Chapter 04 (Tool Execution Engine & Registry).
 *
 * Uses a Map (toolMap) for O(1) lookup of tools by name.
 */

export class ToolRegistry {
  private tools = new Map<string, ITool>();

  /** Register a tool into the registry (adds to toolMap). */
  register(tool: ITool): void {
    this.tools.set(tool.name, tool);
  }

  /** Get a tool by name. */
  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /** Execute a tool by name with given args. */
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