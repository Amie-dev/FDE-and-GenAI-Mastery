/**
 * Core type definitions for the Basic Agent SDK.
 * Based on: Lecture 11 - Agent SDK from Scratch (GAC D08)
 */

// Message roles used in conversation history
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
}

// Tool result returned after execution
export interface ToolResult {
  toolCallId?: string;
  content: string;
}

// LLM engine interface (abstraction over LLM calls)
export interface LLMEngine {
  /** Send conversation to LLM and return response content */
  generate(messages: Message[], options?: Record<string, unknown>): Promise<string>;
}

// Instructions type (from harness)
export interface Instructions {
  /** System prompt / harness instructions */
  systemPrompt?: string;
  /** Optional structured output schema */
  outputSchema?: unknown;
}

// Tool interface - what an agent can call
export interface ITool {
  /** Unique tool name used by LLM for toolCall */
  name: string;
  /** Human-readable description of tool capabilities */
  description: string;
  /** Execute the tool with raw args (JSON string) */
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}