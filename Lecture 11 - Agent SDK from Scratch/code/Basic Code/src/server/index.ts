import express from 'express';
import { AgentBuilder } from '../agent/agent-builder';
import { ITool } from '../types/types';

// --- Core tools used by our basic agent ---

class WeatherTool implements ITool {
  name = 'get_weather';
  description = 'Get current weather for a location';

  async execute(_args: Record<string, unknown>): Promise<{ content: string }> {
    return { content: `Weather: Sunny, 25°C` };
  }
}

class CalculatorTool implements ITool {
  name = 'calculate';
  description = 'Basic calculator tool';

  async execute(args: Record<string, unknown>): Promise<{ content: string }> {
    const a = Number(args.a) || 0;
    const b = Number(args.b) || 0;
    const op = args.op || '+';
    let result: number;
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = b !== 0 ? a / b : Number.POSITIVE_INFINITY; break;
      default: result = a + b;
    }
    return { content: `${a} ${op} ${b} = ${result}` };
  }
}

// --- Express server setup ---

const app = express();
app.use(express.json());

// Initialize a basic agent with tools
const weatherTool = new WeatherTool();
const calcTool = new CalculatorTool();

const agent = new AgentBuilder()
  .setName('basic-agent')
  .setInstructions('You are a helpful assistant. Use tools when appropriate.')
  .setLlmEngine({
    async generate(_messages: any[]) {
      // Minimal inline engine - just echoes last user input
      return 'Echo: ';
    },
  })
  .setTools([weatherTool, calcTool])
  .setMaxLoop(5)
  .build();

// Route: /chat - POST with { message: "..." }
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message || '';
    const result = await agent.run(userMessage);
    res.json({ response: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Basic Agent SDK server listening on port ${PORT}`);
});

export default app;