import { LLMEngine, Instructions, ITool } from './types';

/**
 * Agent configuration for building an Agent via AgentBuilder.
 * Based on Chapter 2 (Builder Pattern & Configuration).
 */

export interface AgentConfig {
  /** Unique agent name */
  name: string;
  /** Instructions for the agent (harness/system prompt) */
  instructions: Instructions;
  /** LLM engine powering the agent */
  llmEngine: LLMEngine;
  /** List of tools available to the agent */
  toolList: ITool[];
  /** Maximum loop iterations before stopping (Chapter 5) */
  maxLoop?: number;
}

/**
 * Agent interface - the runtime agent object.
 * Based on Chapter 1 (Core Architecture).
 */

export interface Agent {
  /** Agent name */
  readonly name: string;
  /** Add a message to history */
  addMessage(message: { role: 'user' | 'assistant' | 'tool'; content: string }): void;
  /** Run the agent with user input, returns final output */
  run(input: string): Promise<string>;
}
