import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { config, PROVIDER_ENDPOINTS } from '../config/config.js';

/** Chapter 03 — the three roles this basic service uses. */
export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content: string;
}

/** Chapter 04 + 10 — usage metadata, normalised across providers including cached prefix & reasoning tokens. */
export interface TokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  uncachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

export interface ChatResult {
  text: string;
  usage: TokenUsage;
  latencyMs: number;
  provider: string;
  model: string;
}

/** Chapter 07 — the seam that keeps routes, controllers and services provider-agnostic. */
export interface Provider {
  name: string;
  chat(messages: ChatMessage[]): Promise<ChatResult>;
}

/**
 * Chapter 07 — OpenAI, Groq, Mistral and Ollama all speak the same wire format,
 * so one SDK plus a different `baseURL` is enough.
 * `maxRetries: 0` on purpose: chapter 06 owns the retry policy — one owner per concern.
 */
const openAiCompatible = (name: string, baseURL: string, apiKey: string): Provider => {
  const client = new OpenAI({ apiKey: apiKey || 'not-needed', baseURL, maxRetries: 0, timeout: 30_000 });

  return {
    name,
    async chat(messages) {
      const startedAt = Date.now();

      const response = await client.chat.completions.create({
        model: config.AI_MODEL,
        messages: messages.map(({ role, content }) => ({ role, content })) as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: config.AI_TEMPERATURE,
        max_tokens: config.AI_MAX_TOKENS,
      });

      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const cachedInputTokens = response.usage?.prompt_tokens_details?.cached_tokens ?? 0;
      const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
      const outputTokens = response.usage?.completion_tokens ?? 0;
      const reasoningTokens = response.usage?.completion_tokens_details?.reasoning_tokens ?? 0;

      return {
        text: response.choices[0]?.message?.content?.trim() ?? '',
        usage: {
          inputTokens,
          cachedInputTokens,
          uncachedInputTokens,
          outputTokens,
          reasoningTokens,
          totalTokens: response.usage?.total_tokens ?? inputTokens + outputTokens,
        },
        latencyMs: Date.now() - startedAt,
        provider: name,
        model: config.AI_MODEL,
      };
    },
  };
};

/**
 * Chapter 07 — Gemini does NOT speak the OpenAI dialect: the body uses `contents`
 * with `parts`, the assistant role is called `model`, and the system role is a
 * separate `systemInstruction` field. That is exactly why an adapter is needed.
 */
const gemini = (apiKey: string): Provider => {
  const ai = new GoogleGenAI({ apiKey });

  return {
    name: 'gemini',
    async chat(messages) {
      const startedAt = Date.now();

      const response = await ai.models.generateContent({
        model: config.AI_MODEL,
        contents: messages
          .filter((message) => message.role !== 'system')
          .map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }],
          })),
        config: {
          systemInstruction: messages
            .filter((message) => message.role === 'system')
            .map((message) => message.content)
            .join('\n'),
          temperature: config.AI_TEMPERATURE,
          maxOutputTokens: config.AI_MAX_TOKENS,
        },
      });

      const usage = response.usageMetadata;
      const inputTokens = usage?.promptTokenCount ?? 0;
      const cachedInputTokens = usage?.cachedContentTokenCount ?? 0;
      const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
      const outputTokens = usage?.candidatesTokenCount ?? 0;
      const reasoningTokens = usage?.thoughtsTokenCount ?? 0;

      return {
        text: response.text?.trim() ?? '',
        usage: {
          inputTokens,
          cachedInputTokens,
          uncachedInputTokens,
          outputTokens,
          reasoningTokens,
          totalTokens: usage?.totalTokenCount ?? inputTokens + outputTokens,
        },
        latencyMs: Date.now() - startedAt,
        provider: 'gemini',
        model: config.AI_MODEL,
      };
    },
  };
};

/** Chapter 08 — a client per provider, built on first use and then cached for the process lifetime. */
const FACTORIES: Record<string, () => Provider> = {
  openai: () => openAiCompatible('openai', PROVIDER_ENDPOINTS.openai, config.OPENAI_API_KEY),
  groq: () => openAiCompatible('groq', PROVIDER_ENDPOINTS.groq, config.GROQ_API_KEY),
  mistral: () => openAiCompatible('mistral', PROVIDER_ENDPOINTS.mistral, config.MISTRAL_API_KEY),
  ollama: () => openAiCompatible('ollama', config.OLLAMA_BASE_URL, ''),
  gemini: () => gemini(config.GEMINI_API_KEY),
};

const clients = new Map<string, Provider>();

/** Chapter 07 — the only place the rest of the app asks "which provider?" */
export const getProvider = (): Provider => {
  const name = config.AI_PROVIDER;
  let provider = clients.get(name);

  if (!provider) {
    provider = FACTORIES[name]();
    clients.set(name, provider);
  }

  return provider;
};

