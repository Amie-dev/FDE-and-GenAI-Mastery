import { Message, MessageRole, LLMEngine } from '../types/types';

/**
 * MessageHistory - manages conversation history.
 * Based on Chapter 5 (Message State, Execution & Interceptors).
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

  addToolMessage(content: string, toolCallId?: string): void {
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
 * Based on Chapter 1 (LLM Engine) - abstraction over LLM provider.
 */
export class BasicLLMEngine implements LLMEngine {
  constructor(private readonly systemPrompt: string) {}

  async generate(messages: Message[], options?: Record<string, unknown>): Promise<string> {
    // Basic implementation - in production this would call the actual LLM provider
    // For basic learning implementation, return a simple echo response
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    return lastUser ? `Echo: ${lastUser.content}` : 'Echo: Hello';
  }
}
