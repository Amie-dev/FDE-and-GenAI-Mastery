import { AgentConfig, Agent } from '../types/agent-config';
import { ITool, LLMEngine, Instructions } from '../types/types';
import { ToolRegistry } from '../core/tool-registry';
import { MessageHistory } from '../core/message-history';
import { HarnessPipeline } from '../harness/reasoning-engine';

/**
 * AgentBuilder - Builder Pattern for constructing Agent instances.
 * Based on Chapter 2 (Builder Pattern & Agent Configuration).
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

  /** Set max loop iterations (Chapter 5) */
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