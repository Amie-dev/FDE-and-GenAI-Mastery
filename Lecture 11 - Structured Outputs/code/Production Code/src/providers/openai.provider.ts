import OpenAI from 'openai';
import { RELIABILITY, config } from '../config/env.js';
import { ProviderError, type ProviderResponse } from '../domain/outcome.js';
import { WIRE_SCHEMAS } from '../domain/meeting.schema.js';
import { estimateTokens } from '../lib/json.js';
import { logger } from '../lib/logger.js';
import { CircuitBreaker, classifyTransportError, deadline, withRetry } from '../lib/retry.js';
import type { CompletionRequest, ProviderPort } from './provider.types.js';

/**
 * Chapter 05 §05.11 — THE REAL PROVIDER ADAPTER.
 *
 * One class covers OpenAI, Groq and Ollama because all three speak the same
 * dialect. The differences that remain are exactly three, and each is a line:
 *
 *   1. the base URL (from config);
 *   2. the enforcement rung the model supports (from the capability registry);
 *   3. whether an API key is required at all (Ollama's is empty).
 *
 * Everything else — retries, timeouts, the circuit breaker, normalisation, error
 * classification — is provider-independent and lives here ONCE.
 */

export interface OpenAiCompatibleOptions {
  readonly provider: string;
  readonly model: string;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly circuit?: CircuitBreaker;
}

export class OpenAiCompatibleProvider implements ProviderPort {
  public readonly name: string;
  public readonly model: string;

  private readonly client: OpenAI;
  private readonly circuit: CircuitBreaker;

  constructor(options: OpenAiCompatibleOptions) {
    this.name = options.provider;
    this.model = options.model;
    this.circuit = options.circuit ?? new CircuitBreaker(undefined, undefined, options.provider);

    this.client = new OpenAI({
      apiKey: options.apiKey || 'not-needed', // a local runtime needs none
      baseURL: options.baseUrl,
      // Chapter 06 §06.3.1 — the SDK's own retry would sit UNDERNEATH the repair
      // loop, turning one logical attempt into several invisible API calls.
      // Retry policy belongs here, where it is logged and bounded.
      maxRetries: 0,
      timeout: RELIABILITY.providerTimeoutMs,
    });
  }

  public healthy(): boolean {
    return this.circuit.healthy();
  }

  public async complete(request: CompletionRequest): Promise<ProviderResponse> {
    // Chapter 09 §09.5.2 — fail fast when the provider is known to be down.
    this.circuit.guard();

    const timer = deadline(request.timeoutMs);

    try {
      const response = await withRetry(() => this.callOnce(request, timer.signal));
      this.circuit.onSuccess();
      return response;
    } catch (error) {
      const classified = classifyTransportError(error);
      // A timeout or a 5xx is the provider's problem; a 401 is not.
      if (classified.failure === 'unavailable' || classified.failure === 'timeout') this.circuit.onFailure();
      throw classified;
    } finally {
      timer.clear();
    }
  }

  /**
   * Chapter 04 §04.3 — THE FOUR API SURFACES, in one place.
   *
   * `native_schema` -> response_format json_schema strict  (Layer 2)
   * `tool_use`      -> a forced single tool call            (the historical bridge)
   * `json_mode`     -> response_format json_object          (Layer 1)
   * `instruction`   -> nothing; the prompt carries the shape (Layer 0)
   */
  private requestShape(request: CompletionRequest): Record<string, unknown> {
    switch (request.enforcement) {
      case 'native_schema':
        return {
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'meeting_extraction', schema: WIRE_SCHEMAS[request.wireTarget], strict: true },
          },
        };
      case 'tool_use':
        return {
          tools: [
            {
              type: 'function',
              function: {
                name: 'emit_meeting_request',
                description: 'Return the extracted meeting request.',
                parameters: WIRE_SCHEMAS[request.wireTarget],
              },
            },
          ],
          tool_choice: { type: 'function', function: { name: 'emit_meeting_request' } },
        };
      case 'json_mode':
        return { response_format: { type: 'json_object' } };
      case 'instruction':
      default:
        return {};
    }
  }

  private async callOnce(request: CompletionRequest, signal: AbortSignal): Promise<ProviderResponse> {
    const messages = [
      { role: 'system' as const, content: request.system },
      // Chapter 06 §06.8 — the ORIGINAL turn is retained; the repair is a FOLLOW-UP.
      { role: 'user' as const, content: request.user },
      ...(request.repair ? [{ role: 'user' as const, content: request.repair }] : []),
    ];

    const completion = await this.client.chat.completions.create(
      {
        model: this.model,
        messages,
        temperature: request.temperature,
        max_tokens: request.maxOutputTokens,
        ...this.requestShape(request),
      },
      { signal },
    );

    const choice = completion.choices[0];
    const message = choice?.message;

    // Chapter 04 §04.3 — at the tool-use rung the object arrives as a JSON STRING
    // inside the arguments, and it still needs parsing (chapter 05 §05.6).
    const fromTool = message?.tool_calls?.[0]?.function?.arguments;
    const text = (fromTool ?? message?.content ?? '').trim();
    const finishReason = choice?.finish_reason ?? 'stop';

    // Chapter 05 §05.10 — the tool-use rung reports a refusal as "no tool call".
    const noToolCall = request.enforcement === 'tool_use' && !fromTool;

    const response: ProviderResponse = {
      text,
      refused: noToolCall || text.length === 0 || finishReason === 'content_filter',
      // Chapter 03 §03.2 #11 — truncation is DETECTED, never guessed.
      truncated: finishReason === 'length',
      inputTokens: completion.usage?.prompt_tokens ?? estimateTokens(request.system + request.user),
      outputTokens: completion.usage?.completion_tokens ?? estimateTokens(text),
      finishReason,
      enforcement: request.enforcement,
      model: this.model,
      provider: this.name,
    };

    logger.debug(
      {
        traceId: request.traceId,
        tenantId: request.tenantId,
        enforcement: request.enforcement,
        finishReason,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        refused: response.refused,
        truncated: response.truncated,
      },
      'provider response',
    );

    return response;
  }
}

/** Chapter 05 §05.11.1 — the composition root builds one of these per deployment. */
export const createProvider = (): ProviderPort =>
  new OpenAiCompatibleProvider({
    provider: config.AI_PROVIDER,
    model: config.AI_MODEL,
    baseUrl: config.AI_ENDPOINT,
    apiKey: config.AI_API_KEY,
    circuit: new CircuitBreaker(undefined, undefined, config.AI_PROVIDER),
  });

/** Chapter 06 §06.3 — re-exported so the service can distinguish the classes. */
export { ProviderError };

