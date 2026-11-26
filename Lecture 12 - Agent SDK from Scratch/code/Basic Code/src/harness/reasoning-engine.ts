import { Message, MessageRole, ToolResult } from '../types/types';
import { ToolRegistry } from '../services/tool-registry';
import { LLMEngine } from '../types/types';
import { MessageHistory } from '../core/message-history';

/**
 * Harness ReAct Pipeline - the 5-stage state machine.
 * Based on Chapter 3 (Harness Prompting & ReAct Pipeline).
 *
 * Stages: INITIAL -> THINK -> TOOL_REQUEST -> ANALYSE -> OUTPUT
 */

export type HarnessStage = 'INITIAL' | 'THINK' | 'TOOL_REQUEST' | 'ANALYSE' | 'OUTPUT';

export interface HarnessContext {
  stage: HarnessStage;
  input: string;
  messages: Message[];
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
  toolResults: ToolResult[];
  finalOutput: string;
  iteration: number;
}

export class HarnessPipeline {
  private readonly maxLoop: number;

  constructor(
    private readonly llmEngine: LLMEngine,
    private readonly toolRegistry: ToolRegistry,
    private readonly systemPrompt: string,
    maxLoop = 10
  ) {
    this.maxLoop = maxLoop;
  }

  async run(input: string, history: MessageHistory): Promise<string> {
    const context: HarnessContext = {
      stage: 'INITIAL',
      input,
      messages: [],
      toolCalls: [],
      toolResults: [],
      finalOutput: '',
      iteration: 0,
    };

    while (context.iteration < this.maxLoop) {
      switch (context.stage) {
        case 'INITIAL':
          context.messages = [
            { role: 'system', content: this.systemPrompt },
            ...history.getMessages(),
            { role: 'user', content: context.input },
          ];
          context.stage = 'THINK';
          break;

        case 'THINK':
          const response = await this.llmEngine.generate(context.messages);
          context.messages.push({ role: 'assistant', content: response });

          if (this.hasToolCall(response)) {
            context.toolCalls = this.parseToolCalls(response);
            context.stage = 'TOOL_REQUEST';
          } else {
            context.finalOutput = response;
            context.stage = 'OUTPUT';
          }
          break;

        case 'TOOL_REQUEST':
          for (const call of context.toolCalls) {
            const result = await this.toolRegistry.execute(call.name, call.args);
            context.toolResults.push(result);
            context.messages.push({ role: 'tool', content: result.content });
          }
          context.stage = 'ANALYSE';
          break;

        case 'ANALYSE':
          // Loop back to THINK with tool results in context
          context.toolCalls = [];
          context.toolResults = [];
          context.stage = 'THINK';
          break;

        case 'OUTPUT':
          return context.finalOutput;
      }
      context.iteration++;
    }

    return 'Error: Max loop iterations reached';
  }

  private hasToolCall(response: string): boolean {
    return response.includes('"toolCall"') || response.includes('tool_call');
  }

  private parseToolCalls(response: string): Array<{ name: string; args: Record<string, unknown> }> {
    // Basic parsing - in production use structured output with schema
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    try {
      const json = JSON.parse(response);
      if (json.toolCalls && Array.isArray(json.toolCalls)) {
        return json.toolCalls;
      }
    } catch {
      // Not JSON, ignore
    }
    return calls;
  }
}