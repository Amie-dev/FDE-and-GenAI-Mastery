# Chapter 6 — Agent Builder (`src/agent/agent-builder.ts`)

**Notes reference:** Chapter 02 (Builder Pattern & Agent Configuration)

## File Details

- **Path:** `src/agent/agent-builder.ts`
- **Command:** Create file

## Full Code

```ts
import { AgentConfig, Agent, ITool, LLMEngine, Instructions } from '../types/types';
import { ToolRegistry } from '../services/tool-registry';
import { MessageHistory } from '../core/message-history';
import { HarnessPipeline } from '../harness/reasoning-engine';

/**
 * AgentBuilder - Builder Pattern for constructing Agent instances.
 * Based on Chapter 02 (Builder Pattern & Agent Configuration).
 *
 * Pattern: AgentBuilder.setName().setInstructions().setLlmEngine().setTools().build()
 */

export class AgentBuilder {
  private config: Partial<AgentConfig> = {};

  /** Set agent name */
  setName(name: string): this {
    this.config.name = name;
    return this;
  }

  /** Set harness/instructions */
  setInstructions(systemPrompt: string): this {
    this.config.instructions = { systemPrompt };
    return this;
  }

  /** Set LLM engine */
  setLlmEngine(llmEngine: LLMEngine): this {
    this.config.llmEngine = llmEngine;
    return this;
  }

  /** Set tools (can be called multiple times) */
  setTools(tools: ITool[]): this {
    this.config.toolList = tools;
    return this;
  }

  /** Set max loop iterations (Chapter 05) */
  setMaxLoop(maxLoop: number): this {
    this.config.maxLoop = maxLoop;
    return this;
  }

  /** Build and return the Agent instance */
  build(): Agent {
    if (!this.config.name) throw new Error('Agent name is required');
    if (!this.config.llmEngine) throw new Error('LLM engine is required');
    if (!this.config.instructions) throw new Error('Instructions are required');
    if (!this.config.toolList) throw new Error('Tool list is required');

    const toolRegistry = new ToolRegistry();
    for (const tool of this.config.toolList) {
      toolRegistry.register(tool);
    }

    const pipeline = new HarnessPipeline(
      this.config.llmEngine,
      toolRegistry,
      this.config.instructions.systemPrompt!,
      this.config.maxLoop
    );

    const messageHistory = new MessageHistory();

    return new AgentImpl(this.config.name, messageHistory, pipeline);
  }
}

class AgentImpl implements Agent {
  constructor(
    public readonly name: string,
    private readonly messageHistory: MessageHistory,
    private readonly pipeline: HarnessPipeline
  ) {}

  addMessage(msg: { role: 'user' | 'assistant' | 'tool'; content: string }): void {
    this.messageHistory.addMessage(msg);
  }

  run(input: string): Promise<string> {
    return this.pipeline.run(input, this.messageHistory);
  }
}
```

## Block by Block Explanation

| Code block | What it does | How it works |
|---|---|---|
| `class AgentBuilder { private config: Partial<AgentConfig> = {} }` | Holds partial configuration while the developer chains setter methods. | `config` starts as an empty partial object. Each setter fills in one field. |
| `setName(name: string): this` | Sets the agent name. Returns `this` for chaining. | Sets `this.config.name = name` and returns `this`. |
| `setInstructions(systemPrompt: string): this` | Sets the harness/system prompt. Returns `this` for chaining. | Sets `this.config.instructions = { systemPrompt }` and returns `this`. |
| `setLlmEngine(llmEngine: LLMEngine): this` | Sets the LLM engine. Returns `this` for chaining. | Sets `this.config.llmEngine = llmEngine` and returns `this`. |
| `setTools(tools: ITool[]): this` | Sets the tools list. Returns `this` for chaining. | Sets `this.config.toolList = tools` and returns `this`. |
| `setMaxLoop(maxLoop: number): this` | Sets the maximum loop iterations. Returns `this` for chaining. | Sets `this.config.maxLoop = maxLoop` and returns `this`. |
| `build(): Agent` | Validates required config. Creates a `ToolRegistry`, registers all tools, builds a `HarnessPipeline`, creates a `MessageHistory`, and returns an `AgentImpl`. | Throws errors if any required field (name, llmEngine, instructions, toolList) is missing. Creates `ToolRegistry` and registers each tool. Creates `HarnessPipeline` with the LLM engine, registry, system prompt, and maxLoop. Creates `MessageHistory`. Returns `new AgentImpl(...)`. |
| `class AgentImpl implements Agent` | The actual Agent runtime. Holds name, message history, and pipeline. | Implements the `Agent` interface. `name` is public readonly. `messageHistory` and `pipeline` are private. |
| `addMessage(msg): void` | Pushes a message into message history. | Delegates to `this.messageHistory.addMessage(msg)`. |
| `run(input: string): Promise<string>` | Delegates to `pipeline.run(input, history)` — the ReAct loop. | Calls `this.pipeline.run(input, this.messageHistory)` and returns the result. |
