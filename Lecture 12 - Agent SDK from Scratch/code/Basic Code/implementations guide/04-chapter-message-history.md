# Chapter 4 — Message History Core (`src/core/message-history.ts`)

**Notes reference:** Chapter 05 (Message State, Execution & Interceptors)

## File Details

- **Path:** `src/core/message-history.ts`
- **Command:** Create file

## Full Code

```ts
import { Message, MessageRole, LLMEngine } from '../types/types';

/**
 * MessageHistory - manages conversation history.
 * Based on Chapter 05 (Message State, Execution & Interceptors).
 *
 * Supports addMessage, getMessages, clear, and interceptor hooks.
 */

export type Interceptor = (message: Message) => Message | null;

export class MessageHistory {
  private messages: Message[] = [];
  private interceptors: Interceptor[] = [];

  addMessage(message: Message): void {
    for (const interceptor of this.interceptors) {
      const result = interceptor(message);
      if (result === null) return;
      message = result;
    }
    this.messages.push(message);
  }

  addUserMessage(content: string): void {
    this.addMessage({ role: 'user', content });
  }

  addAssistantMessage(content: string): void {
    this.addMessage({ role: 'assistant', content });
  }

  addToolMessage(content: string): void {
    this.addMessage({ role: 'tool', content });
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  use(interceptor: Interceptor): void {
    this.interceptors.push(interceptor);
  }
}

/**
 * LLM Engine implementation - basic wrapper around an LLM call.
 * Based on Chapter 01 (LLM Engine) - abstraction over LLM provider.
 */
export class BasicLLMEngine implements LLMEngine {
  constructor(private readonly systemPrompt: string) {}

  async generate(messages: Message[]): Promise<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    return lastUser ? `Echo: ${lastUser.content}` : 'Echo: Hello';
  }
}
```

## Block by Block Explanation

| Code block | What it does | How it works |
|---|---|---|
| `export type Interceptor = (message: Message) => Message \| null` | An interceptor can observe or modify a message. Returning `null` drops the message. | A function type that takes a `Message` and returns either a (possibly modified) `Message` or `null` to drop it. |
| `private messages: Message[] = []` | Internal array storing the conversation history. | Starts empty. Every message added via `addMessage` is pushed here. |
| `private interceptors: Interceptor[] = []` | Registered interceptor hooks. | Starts empty. New interceptors are added via `use()`. |
| `addMessage(message: Message): void` | Runs the message through every interceptor. If any returns `null`, the message is dropped. Otherwise the (possibly modified) message is stored. | Loops through all interceptors. Each interceptor receives the message and may modify it. If any returns `null`, the method returns early (message not stored). Otherwise, the final message is pushed to `this.messages`. |
| `addUserMessage(content: string): void` | Convenience method that adds a message with the `user` role. | Calls `this.addMessage({ role: 'user', content })`. |
| `addAssistantMessage(content: string): void` | Convenience method that adds a message with the `assistant` role. | Calls `this.addMessage({ role: 'assistant', content })`. |
| `addToolMessage(content: string): void` | Convenience method that adds a message with the `tool` role. | Calls `this.addMessage({ role: 'tool', content })`. |
| `getMessages(): Message[]` | Returns a shallow copy of all messages so callers can't mutate internal state. | Uses the spread operator `[...this.messages]` to return a new array copy. |
| `clear(): void` | Empties the history. | Sets `this.messages = []`. |
| `use(interceptor: Interceptor): void` | Registers a new interceptor hook (used for logging, tracing, auditing). | Pushes the interceptor function into `this.interceptors` array. |
| `class BasicLLMEngine implements LLMEngine` | Minimal LLM engine for learning. It finds the last user message and echoes it back. In production this would call a real LLM provider (OpenAI, Gemini, etc.). | Implements the `LLMEngine` interface. `generate()` finds the last message with role `user` by reversing the array and searching. Returns `` `Echo: ${content}` `` or a default greeting. |
