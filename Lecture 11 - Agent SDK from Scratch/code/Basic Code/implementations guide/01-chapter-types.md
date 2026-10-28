# Chapter 1 — Types (`src/types/types.ts`)

**Notes reference:** Chapter 01 (Agent SDK Architecture), Chapter 02 (Builder & Configuration)

## File Details

- **Path:** `src/types/types.ts`
- **Command:** Create file

## Full Code

```ts
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
```

## Block by Block Explanation

| Code block | What it does | How it works |
|---|---|---|
| `export type MessageRole = 'system' \| 'user' \| 'assistant' \| 'tool'` | Defines the four roles a message can have: `system`, `user`, `assistant`, `tool`. | A TypeScript union type that restricts message roles to these four values only. |
| `export interface Message { role: MessageRole; content: string }` | One turn in conversation history. Carries `role` and `content`. | An object with two properties: `role` (typed as `MessageRole`) and `content` (string). |
| `export interface ToolResult { toolCallId?: string; content: string }` | The result a tool returns after running. `toolCallId` links it back to the tool call; `content` is the result text. | `toolCallId` is optional (some results may not link to a specific call). `content` holds the tool output as a string. |
| `export interface LLMEngine { generate(messages: Message[], options?: Record<string, unknown>): Promise<string> }` | Abstraction over the LLM provider. The SDK only calls `generate(messages)` and gets a string back. | Defines a single method `generate()` that takes an array of `Message` and optional options, returns a `Promise<string>`. Any provider (OpenAI, Gemini, etc.) can implement this. |
| `export interface Instructions { systemPrompt?: string; outputSchema?: unknown }` | The harness/system prompt given to the LLM, plus an optional output schema. | `systemPrompt` is the text instruction for the agent. `outputSchema` is optional for structured output validation. |
| `export interface ITool { name: string; description: string; execute(args: Record<string, unknown>): Promise<ToolResult> }` | The tool contract. Every tool has a unique `name`, a `description` for the LLM, and an `execute(args)` that returns a `ToolResult`. | `name` is used for lookup in the tool registry. `description` tells the LLM what the tool does. `execute` contains the actual tool logic. |
| `export interface AgentConfig { name: string; instructions: Instructions; llmEngine: LLMEngine; toolList: ITool[]; maxLoop?: number }` | Configuration passed to the Builder: name, instructions, LLM engine, tool list, and optional `maxLoop` safety cap. | Groups all agent dependencies into one object. `maxLoop` defaults to undefined (handled by HarnessPipeline with default 10). |
| `export interface Agent { readonly name: string; addMessage(...): void; run(input: string): Promise<string> }` | The runtime Agent: read-only `name`, `addMessage()` to push history, and `run(input)` to execute the agent. | `name` is read-only. `addMessage` accepts role/content. `run` takes user input and returns a Promise resolving to the final output string. |
