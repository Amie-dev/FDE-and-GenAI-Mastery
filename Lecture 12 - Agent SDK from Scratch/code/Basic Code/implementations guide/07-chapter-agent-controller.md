# Chapter 7 — Agent Controller (`src/controllers/agent-controller.ts`)

**Notes reference:** Chapter 07 (Guardrails & Production - Express /chat endpoint)

## File Details

- **Path:** `src/controllers/agent-controller.ts`
- **Command:** Create file

## Full Code

```ts
import { Request, Response } from 'express';
import { Agent, ITool, ToolResult } from '../types/types';

/** Example tool: returns a fixed weather response. */
class WeatherTool implements ITool {
  name = 'get_weather';
  description = 'Get current weather for a location';

  async execute(): Promise<ToolResult> {
    return { content: 'Weather: Sunny, 25°C' };
  }
}

/** Example tool: basic calculator. */
class CalculatorTool implements ITool {
  name = 'calculate';
  description = 'Basic calculator tool';

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const a = Number(args.a) || 0;
    const b = Number(args.b) || 0;
    const op = String(args.op || '+');
    let result = 0;
    if (op === '+') result = a + b;
    else if (op === '-') result = a - b;
    else if (op === '*') result = a * b;
    else if (op === '/') result = b !== 0 ? a / b : 0;
    return { content: `${a} ${op} ${b} = ${result}` };
  }
}

/**
 * Creates the Express chat controller wired to a built Agent.
 * Based on Chapter 07 (Express Server /chat endpoint).
 */
export function makeChatController(agent: Agent) {
  return async (req: Request, res: Response) => {
    try {
      const userMessage = req.body.message || '';
      const result = await agent.run(userMessage);
      res.json({ response: result });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export { WeatherTool, CalculatorTool };
```

## Block by Block Explanation

| Code block | What it does | How it works |
|---|---|---|
| `class WeatherTool implements ITool` | Example tool that returns a fixed weather response. Implements the `ITool` contract. | `name` is `'get_weather'`, `description` describes it. `execute()` ignores args and returns a fixed `{ content: 'Weather: Sunny, 25°C' }`. |
| `class CalculatorTool implements ITool` | Example tool that does basic math (+, -, *, /) on args `a`, `b`, `op`. | Reads `args.a`, `args.b`, `args.op`. Performs the operation and returns a formatted result string like `"5 + 3 = 8"`. Division by zero returns 0. |
| `export function makeChatController(agent: Agent)` | Factory that returns an Express route handler. It calls `agent.run(userMessage)` and sends back `{ response }`. On error, returns 500. | Reads `req.body.message`. Calls `agent.run(message)`. Sends `res.json({ response: result })`. On error, sends `res.status(500).json({ error: 'Internal server error' })`. |
| `export { WeatherTool, CalculatorTool }` | Exports the example tools so `server/index.ts` can instantiate them. | Named exports so other modules can import and use these tool classes. |
