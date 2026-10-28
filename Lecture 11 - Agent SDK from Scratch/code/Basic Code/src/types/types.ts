/**
 * Core type definitions for the Basic Agent SDK.
 * Based on: Lecture 11 - Agent SDK from Scratch (GAC D08)
 * Chapters: 01 (Architecture), 02 (Builder & Configuration)
 */

// Message roles used in conversation history
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** Single turn in the conversation history. */
export interface Message {
  role: MessageRole;
  content: string;
}

/** Result returned by a tool after execution. */
export interface ToolResult {
  toolCallId?: string;
  content: string;
}

/** Abstraction over LLM provider. The Agent SDK only needs generate(). */
export interface LLMEngine {
  generate(messages: Message[], options?: Record<string, unknown>): Promise<string>;
}

/** Harness/system prompt and optional structured output schema. */
export interface Instructions {
  systemPrompt?: string;
  outputSchema?: unknown;
}

/** Tool contract: unique name, description, and execute function. */
export interface ITool {
  name: string;
  description: string;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

/** Configuration object passed to the AgentBuilder. */
export interface AgentConfig {
  name: string;
  instructions: Instructions;
  llmEngine: LLMEngine;
  toolList: ITool[];
  maxLoop?: number;
}

/** Runtime Agent interface. */
export interface Agent {
  readonly name: string;
  addMessage(message: { role: 'user' | 'assistant' | 'tool'; content: string }): void;
  run(input: string): Promise<string>;
}