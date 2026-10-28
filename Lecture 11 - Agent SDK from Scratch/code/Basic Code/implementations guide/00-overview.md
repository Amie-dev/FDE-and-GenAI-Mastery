# Implementation Guide — Basic Agent SDK (Lecture 11)

Follow chapters 0 → 8 in order. Each chapter builds on the previous one.

## Folder Structure

```
code/Basic Code/
├── .env
├── package.json
├── package-lock.json
├── tsconfig.json
└── src/
    ├── config/config.ts
    ├── types/types.ts
    ├── services/tool-registry.ts
    ├── core/message-history.ts
    ├── harness/reasoning-engine.ts
    ├── agent/agent-builder.ts
    ├── controllers/agent-controller.ts
    └── server/index.ts
```

## Chapter List

| Chapter | File | What it implements |
|---------|------|-------------------|
| 0 | `00-chapter-file-structure.md` | One file per folder layout |
| 1 | `01-chapter-types.md` | Message, ToolResult, LLMEngine, Instructions, ITool, AgentConfig, Agent types |
| 2 | `02-chapter-config.md` | PORT and NODE_ENV configuration |
| 3 | `03-chapter-tool-registry.md` | ToolRegistry — register, get, execute via toolMap |
| 4 | `04-chapter-message-history.md` | MessageHistory + Interceptor + BasicLLMEngine |
| 5 | `05-chapter-harness-react.md` | HarnessPipeline — 5-stage ReAct loop |
| 6 | `06-chapter-agent-builder.md` | AgentBuilder (fluent) + AgentImpl runtime |
| 7 | `07-chapter-agent-controller.md` | Example tools + Express /chat controller |
| 8 | `08-chapter-express-server.md` | Express app, /chat and /health routes, server listen |

## Commands

Run these from the `code/Basic Code` folder:

```bash
# Install dependencies
npm install

# Compile TypeScript to dist/
npm run build

# Run the compiled server
npm start

# Run with ts-node (no build step, for development)
npm run dev
```

### Test the server

```bash
# In one terminal, start the server
npm run dev

# In another terminal, send a chat request
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'

# Health check
curl http://localhost:3000/health
```
