import express from 'express';
import { AgentBuilder } from '../agent/agent-builder';
import { BasicLLMEngine } from '../core/message-history';
import { WeatherTool, CalculatorTool, makeChatController } from '../controllers/agent-controller';
import { config } from '../config/config';

const app = express();
app.use(express.json());

const llmEngine = new BasicLLMEngine('You are a helpful assistant.');

const agent = new AgentBuilder()
  .setName('basic-agent')
  .setInstructions('You are a helpful assistant. Use tools when appropriate.')
  .setLlmEngine(llmEngine)
  .setTools([new WeatherTool(), new CalculatorTool()])
  .setMaxLoop(5)
  .build();

const chat = makeChatController(agent);

app.post('/chat', chat);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(config.port, () => {
  console.log(`Basic Agent SDK server listening on port ${config.port}`);
});

export default app;