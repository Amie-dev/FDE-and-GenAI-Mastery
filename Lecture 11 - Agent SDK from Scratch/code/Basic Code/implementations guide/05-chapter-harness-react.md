# Chapter 5 — Harness ReAct Pipeline (`src/harness/reasoning-engine.ts`)

**Notes reference:** Chapter 03 (Harness Prompting & ReAct Pipeline)

## File Details

- **Path:** `src/harness/reasoning-engine.ts`
- **Command:** Create file

## Full Code

```ts
import { Message, ToolResult } from '../types/types';
import { ToolRegistry } from '../services/tool-registry';
import { LLMEngine } from '../types/types';
import { MessageHistory } from '../core/message-history';

/**
 * Harness ReAct Pipeline - the 5-stage state machine.
 * Based on Chapter 03 (Harness Prompting & ReAct Pipeline).
 *
 * Stages: INITIAL -> THINK -> TOOL_REQUEST -> ANALYSE -> OUTPUT
 */

export type HarnessStage = 'INITIAL' | 'THINK' | 'TOOL_REQUEST' | 'ANALYSE' | 'OUTPUT';

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
    let messages: Message[] = [];
    let toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
    let finalOutput = '';
    let iteration = 0;
    let stage: HarnessStage = 'INITIAL';

    while (iteration < this.maxLoop) {
      if (stage === 'INITIAL') {
        messages = [
          { role: 'system', content: this.systemPrompt },
          ...history.getMessages(),
          { role: 'user', content: input },
        ];
        stage = 'THINK';
      } else if (stage === 'THINK') {
        const response = await this.llmEngine.generate(messages);
        messages.push({ role: 'assistant', content: response });

        if (this.hasToolCall(response)) {
          toolCalls = this.parseToolCalls(response);
          stage = 'TOOL_REQUEST';
        } else {
          finalOutput = response;
          stage = 'OUTPUT';
        }
      } else if (stage === 'TOOL_REQUEST') {
        for (const call of toolCalls) {
          const result = await this.toolRegistry.execute(call.name, call.args);
          messages.push({ role: 'tool', content: result.content });
        }
        toolCalls = [];
        stage = 'ANALYSE';
      } else if (stage === 'ANALYSE') {
        stage = 'THINK';
      } else if (stage === 'OUTPUT') {
        return finalOutput;
      }
      iteration++;
    }

    return 'Error: Max loop iterations reached';
  }

  private hasToolCall(response: string): boolean {
    return response.includes('"toolCall"') || response.includes('tool_call');
  }

  private parseToolCalls(response: string): Array<{ name: string; args: Record<string, unknown> }> {
    try {
      const json = JSON.parse(response);
      if (json.toolCalls && Array.isArray(json.toolCalls)) {
        return json.toolCalls;
      }
    } catch {
      // Not JSON, ignore
    }
    return [];
  }
}
```

## Block by Block Explanation

| Code block | What it does | How it works |
|---|---|---|
| `export type HarnessStage = 'INITIAL' \| 'THINK' \| 'TOOL_REQUEST' \| 'ANALYSE' \| 'OUTPUT'` | The 5-stage state machine: `INITIAL → THINK → TOOL_REQUEST → ANALYSE → OUTPUT`. | A TypeScript union type restricting stage values to these five strings. |
| `constructor(llmEngine, toolRegistry, systemPrompt, maxLoop = 10)` | Stores the LLM engine, tool registry, system prompt, and max loop safety cap. | `maxLoop` defaults to 10 if not provided. All dependencies are stored as private readonly fields. |
| `while (iteration < this.maxLoop)` | The main ReAct loop. Stops after `maxLoop` iterations to prevent infinite execution. | Increments `iteration` at the end of each loop cycle. When it reaches `maxLoop`, the loop exits and returns an error message. |
| `if (stage === 'INITIAL')` | Builds the message array: system prompt + history + current user input. | Combines the system prompt, all previous messages from history, and the current user input into one array. Then transitions to `THINK`. |
| `else if (stage === 'THINK')` | Calls `llmEngine.generate(messages)`. If the response contains a tool call, go to `TOOL_REQUEST`; otherwise go to `OUTPUT` with the response as final output. | Calls the LLM engine with the built messages. Pushes the assistant response to messages. Checks `hasToolCall()` to decide the next stage. |
| `else if (stage === 'TOOL_REQUEST')` | Executes each requested tool via `toolRegistry.execute()` and appends results as tool messages. | Loops through all tool calls, executes each one, and pushes the result as a role `tool` message. Clears toolCalls and transitions to `ANALYSE`. |
| `else if (stage === 'ANALYSE')` | Resets tool calls/results and loops back to `THINK` so the LLM can reason again with the new tool results. | Clears `toolCalls` array and sets stage back to `THINK`. The LLM is called again with the updated message history including tool results. |
| `else if (stage === 'OUTPUT')` | Returns the final output string. | Returns `finalOutput` which contains the LLM's final response. |
| `private hasToolCall(response: string): boolean` | Detects whether the LLM response contains a tool call request. | Checks if the response string includes `"toolCall"` or `tool_call`. Returns boolean. |
| `private parseToolCalls(response: string)` | Parses JSON tool calls from the LLM response. Returns empty array if parsing fails (defensive). | Tries `JSON.parse(response)`. If the result has a `toolCalls` array, returns it. On any error, returns `[]`. |
