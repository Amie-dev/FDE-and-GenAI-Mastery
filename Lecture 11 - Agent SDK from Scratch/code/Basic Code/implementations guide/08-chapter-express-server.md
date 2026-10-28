# Chapter 8 — Express Server (`src/server/index.ts`)

**Notes reference:** Chapter 07 (Express Server /chat endpoint)

## File Details

- **Path:** `src/server/index.ts`
- **Command:** `npm install` then `npm run dev`

## Full Code

```ts
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
```

## Block by Block Explanation

| Code block | What it does | How it works |
|---|---|---|
| `import express from 'express'` | Imports the Express framework. | Imports the default export from the `express` package. |
| `const app = express(); app.use(express.json());` | Creates the Express app and enables JSON body parsing. | `express()` creates an app instance. `app.use(express.json())` middleware parses incoming JSON request bodies into `req.body`. |
| `const llmEngine = new BasicLLMEngine('You are a helpful assistant.')` | Creates the minimal LLM engine (echoes last user message). | Passes a system prompt string to `BasicLLMEngine`. |
| `new AgentBuilder().setName(...).setInstructions(...).setLlmEngine(...).setTools(...).setMaxLoop(5).build()` | Configures and builds the Agent with name, instructions, LLM engine, tools, and maxLoop=5. | Chains fluent setters: name='basic-agent', instructions text, the llmEngine, two tools (WeatherTool, CalculatorTool), maxLoop=5. Then calls `.build()` to create the Agent. |
| `const chat = makeChatController(agent)` | Creates the /chat route handler wired to the built Agent. | Passes the built agent to `makeChatController`, which returns an Express route handler function. |
| `app.post('/chat', chat)` | HTTP endpoint: POST `{ "message": "..." }` → `{ "response": "..." }`. | Registers the `chat` handler for POST requests to `/chat`. |
| `app.get('/health', (_req, res) => res.json({ status: 'ok' }))` | Health check endpoint returning `{ status: 'ok' }`. | Simple GET route that responds with JSON `{ status: 'ok' }`. |
| `app.listen(config.port, ...)` | Starts the server on the configured port. | Calls `app.listen()` with the port from `config.port`. Logs a message when the server is ready. |
