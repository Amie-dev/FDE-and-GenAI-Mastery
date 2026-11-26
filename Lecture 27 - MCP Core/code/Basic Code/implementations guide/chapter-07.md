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

## Code Example (from `src/client/client.ts`)

### 1. DISCOVERY

```typescript
// 1. DISCOVERY
const { tools } = await client.listTools();
console.log(`tools/list -> ${tools.map(t => t.name).join(", ")}`);
```

**Explanation:**

- `client.listTools()` → calls the MCP server's `tools/list` capability
- **Cached catalogue**: The result is NOT called on every user message. It's cached until the server sends a `notifications/tools/list_changed` notification.
- Returns all registered tool definitions (name, description, inputSchema)
- Output: `{ tools: Tool[] }` where each tool has `name`, `description`, `inputSchema`

### 2. SELECTION

```typescript
// 2. SELECTION (deterministic stand-in for LLM)
const selected = tools.find(t => t.name === "create_task");
if (!selected) throw new Error("create_task missing from catalogue");
console.log(`selected model chose: ${selected.name}`);
```

**Explanation:**

- In production, the LLM probabilistically picks a tool based on the model's analysis of available tools and the user's request
- **Here we hard-code it** to make the lifecycle deterministic and testable
- `selected.name` is used in the next invocation step

### 3. INVOCATION

```typescript
// 3. INVOCATION
const created = await client.callTool({ name: selected.name, arguments: { title: "Record MCP Video" } });
console.log(`created result:`, created.content);
```

**Explanation:**

- `client.callTool({ name, arguments })` — Routes the model's tool choice to the server
- The host resolves `selected.name` to the correct client connection
- The server executes the registered handler function from `src/tools/tools.ts`
- Returns a result with `content` blocks and optional `structuredContent`

### 4. FAILURE (isError=true)

```typescript
// 4. FAILURE (isError=true is a result, not protocol error)
const failed = await client.callTool({ name: "complete_task", arguments: { title: "No such task" } });
// failed.isError === true means "operation failed", model can recover
```

**Explanation:**

- **Critical distinction**: `isError: true` is a **result**, not a JSON-RPC protocol error
- The tool call succeeded (the *method* was found and executed), but the **outcome** failed
- The error text lands in the model's context so it can reason about recovery
- The model can then decide what to do: ask the user, try again with corrected input, fall back to another approach

### 5. RESOURCES

```typescript
// 5. RESOURCES
const { resources } = await client.listResources();
const read = await client.readResource({ uri: resources[0].uri });
console.log(`read resource:`, read.contents[0]);
```

**Explanation:**

- Resources are **application-driven**, not model-driven
- The app decides which resources to present to the model
- `client.listResources()` → discovers available resources (their URIs and metadata)
- `client.readResource({ uri })` → retrieves the resource content by URI
- The handler in `src/resources/resources.ts` returns the text content for that URI
- **Never called by the model** to decide what to do — only by the application to fetch context

### 6. PROMPTS

```typescript
// 6. PROMPTS
const { prompts } = await client.listPrompts();
const prompt = await client.getPrompt({ name: "review_pull_request", arguments: { prNumber: "42" } });
console.log(`prompt content:`, prompt.messages[0].content);
```

**Explanation:**

- Prompts are **user-driven**: the UI lists them, the user picks one, the host calls `prompts/get` with arguments
- `client.listPrompts()` → discovers available prompt templates
- `client.getPrompt({ name, arguments })` → returns messages with arguments substituted
- The prompt handler returns a `messages` array (not a tool result)
- This is how reusable workflows/instructions get into the model's context

## Key Points

- **Tools are cached**: No per-message discovery round trip
- **Tool name resolves to the client**: 1:1 per connection, not globally
- **`isError=true` is a result** — the text lands in model context for recovery
- **Resources/prompts are driven by application/user**, not the model

## Command

```bash
npm run client   # Run the complete lifecycle demo
```