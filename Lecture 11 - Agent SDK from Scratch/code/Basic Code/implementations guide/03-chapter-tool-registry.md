# Chapter 3 — Tool Registry Service (`src/services/tool-registry.ts`)

**Notes reference:** Chapter 04 (Tool Execution Engine & Registry)

## File Details

- **Path:** `src/services/tool-registry.ts`
- **Command:** Create file

## Full Code

```ts
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
```

## Block by Block Explanation

| Code block | What it does | How it works |
|---|---|---|
| `private tools = new Map<string, ITool>()` | Internal `toolMap` — stores tools by name for O(1) lookup. | A JavaScript Map where keys are tool names (strings) and values are `ITool` instances. |
| `register(tool: ITool): void` | Adds a tool to the map using `tool.name` as the key. | Calls `this.tools.set(tool.name, tool)`. If a tool with the same name exists, it is overwritten. |
| `get(name: string): ITool \| undefined` | Looks up a tool by name. Returns `undefined` if not found. | Calls `this.tools.get(name)`. Returns the tool or `undefined`. |
| `async execute(name: string, args: Record<string, unknown>): Promise<ToolResult>` | Finds the tool in the map, calls `tool.execute(args)`, and returns the result. If the tool is missing or throws, returns an error `ToolResult` so the Agent can recover instead of crashing. | 1) Calls `this.get(name)` to find the tool. 2) If not found, returns `{ content: "Error: Tool 'X' not found" }`. 3) If found, calls `tool.execute(args)` inside try/catch. 4) On success returns the tool result. 5) On error returns `{ content: "Error executing tool 'X': <message>" }`. |
