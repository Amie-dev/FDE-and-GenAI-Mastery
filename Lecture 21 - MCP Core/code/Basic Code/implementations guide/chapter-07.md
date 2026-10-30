# Chapter 07: Discovery, Selection, Invocation & Lifecycle

## Key Concepts

- Discovery: `tools/list` (cached catalogue, not per-message round trip)
- Selection: tool calling — the one probabilistic step (the model chooses)
- Invocation: `tools/call` — model names a tool, host resolves to the client
- Failure: tool execution error is a *result* with `isError: true`, not a protocol error

## Lifecycle Flow

```
1. DISCOVERY  → client.listTools() → tools catalogue (cached)
2. SELECTION  → model picks create_task (probabilistic, LLM)
3. INVOCATION → client.callTool({name, args}) → tool executes
4. FAILURE    → result with isError=true (recoverable message)
5. RESOURCES  → application-driven: listResources, readResource
6. PROMPTS    → user-driven: listPrompts, getPrompt
```

## Code Example (from `client.ts`)

```typescript
// 1. DISCOVERY
const { tools } = await client.listTools();
console.log(`tools/list -> ${tools.map(t => t.name).join(", ")}`);

// 2. SELECTION (deterministic stand-in for LLM)
const selected = tools.find(t => t.name === "create_task");
if (!selected) throw new Error("create_task missing from catalogue");

// 3. INVOCATION
const created = await client.callTool({ name: selected.name, arguments: { title: "Record MCP Video" } });

// 4. FAILURE (isError=true is a result, not protocol error)
const failed = await client.callTool({ name: "complete_task", arguments: { title: "No such task" } });
// failed.isError === true means "operation failed", model can recover

// 5. RESOURCES
const { resources } = await client.listResources();
const read = await client.readResource({ uri: resources[0].uri });

// 6. PROMPTS
const { prompts } = await client.listPrompts();
const prompt = await client.getPrompt({ name: "review_pull_request", arguments: { prNumber: "42" } });
```

## Key Points

- Tools are cached: no per-message discovery round trip
- Tool name resolves to the client (1:1 per connection, not global)
- isError=true is a *result* — the text lands in model context for recovery
- Resources/prompts are driven by application/user, not the model