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