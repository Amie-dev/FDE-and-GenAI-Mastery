import type { ProviderResponse } from '../domain/outcome.js';
import { SCHEMA_VERSION } from '../domain/meeting.schema.js';
import { estimateTokens } from '../lib/json.js';
import { SYSTEM_PROMPT } from './prompt.js';
import type { CompletionRequest, ProviderPort } from './provider.types.js';

/**
 * Chapter 05 §05.11 — THE DETERMINISTIC PROVIDER.
 *
 * This is the most valuable piece of test infrastructure in the lecture, and it
 * is easy to mistake for a toy. It is not: it is what makes the evaluation
 * harness reproducible (chapter 09 §09.4), what makes the metrics table in the
 * gate possible (§09.2), and what lets CI run the WHOLE pipeline on every pull
 * request with zero spend.
 *
 * It is deliberately adversarial: it can emit the failure modes of chapter 03
 * §03.2 — a wrong TYPE, an ENUM drift, chatty prose, a refusal, a truncation —
 * and it corrects the fixable ones when a repair turn arrives. A provider that
 * only ever succeeded would test nothing.
 */

export interface StubBehaviour {
  /** Chapter 03 §03.2 #7 — emit `durationMinutes` as a string on attempt 1. */
  readonly wrongType: boolean;
  /** Chapter 03 §03.2 #9 — emit the raw phrase as the enum value on attempt 1. */
  readonly enumDrift: boolean;
  /** Chapter 06 §06.10 — decline. */
  readonly refuse: boolean;
  /** Chapter 06 §06.10 — return a half-written object with `finish_reason: length`. */
  readonly truncate: boolean;
  /** Chapter 03 §03.2 #1 and #2 — wrap the JSON in prose and a markdown fence. */
  readonly chatty: boolean;
}

/** A provider that behaves. Used by the "clean" golden cases. */
export const CLEAN_BEHAVIOUR: StubBehaviour = {
  wrongType: false,
  enumDrift: false,
  refuse: false,
  truncate: false,
  chatty: false,
};

/** The default: the two slips of chapter 03, fixed by the repair loop. */
export const SLIPPERY_BEHAVIOUR: StubBehaviour = {
  wrongType: true,
  enumDrift: true,
  refuse: false,
  truncate: false,
  chatty: false,
};

const has = (text: string, pattern: RegExp): boolean => pattern.test(text);

/** Chapter 04 §04.7.1 — resolve a relative date. A model cannot infer "today". */
const resolveDate = (text: string, now: Date): string => {
  const base = new Date(now.getTime());
  if (has(text, /\bday after tomorrow\b/i)) base.setUTCDate(base.getUTCDate() + 2);
  else if (has(text, /\btomorrow\b/i)) base.setUTCDate(base.getUTCDate() + 1);
  else if (has(text, /\bnext week\b/i)) base.setUTCDate(base.getUTCDate() + 7);
  return base.toISOString().slice(0, 10);
};

/** Chapter 04 §04.7 — normalise "4 PM" into 24-hour time. */
const resolveTime = (text: string): string | null => {
  const twelve = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (twelve) {
    const hour = (Number(twelve[1]) % 12) + (twelve[3]?.toLowerCase() === 'pm' ? 12 : 0);
    return `${String(hour).padStart(2, '0')}:${twelve[2] ?? '00'}`;
  }
  const twentyFour = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  return twentyFour ? `${twentyFour[1]?.padStart(2, '0')}:${twentyFour[2]}` : null;
};

/** Chapter 04 §04.7 — "half an hour" -> 30. A number, not prose. */
const resolveDuration = (text: string): number | null => {
  if (has(text, /\bhalf an hour\b/i)) return 30;
  const match = text.match(/\b(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|h)\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  return /^h/i.test(match[2] ?? '') ? Math.round(value * 60) : Math.round(value);
};

/** Chapter 04 §04.7 — an IANA zone, so the instant is unambiguous. */
const resolveTimeZone = (text: string): string => {
  if (has(text, /\b(ist|india|kolkata|bangalore|delhi|mumbai)\b/i)) return 'Asia/Kolkata';
  if (has(text, /\b(est|new york|boston)\b/i)) return 'America/New_York';
  if (has(text, /\b(pst|san francisco|seattle|los angeles)\b/i)) return 'America/Los_Angeles';
  if (has(text, /\b(cet|berlin|paris|madrid)\b/i)) return 'Europe/Berlin';
  return 'UTC';
};

export interface StubProviderOptions {
  readonly behaviour?: StubBehaviour;
  readonly now?: () => Date;
}

/**
 * The provider. Chapter 05 §05.11 — it returns a NORMALISED response and never
 * validates; whether the object is good enough is the service's decision.
 */
export class StubProvider implements ProviderPort {
  public readonly name = 'stub';
  public readonly model = 'stub-deterministic-v1';

  private readonly behaviour: StubBehaviour;
  private readonly now: () => Date;

  constructor(options: StubProviderOptions = {}) {
    this.behaviour = options.behaviour ?? SLIPPERY_BEHAVIOUR;
    this.now = options.now ?? (() => new Date());
  }

  public healthy(): boolean {
    return true;
  }

  public async complete(request: CompletionRequest): Promise<ProviderResponse> {
    const asked = `${request.system}\n${request.user}\n${request.repair ?? ''}`;
    const inputTokens = estimateTokens(asked);
    const isRepairTurn = typeof request.repair === 'string' && request.repair.length > 0;

    // Chapter 06 §06.10 — a refusal, modelled as an outcome rather than a throw.
    if (
      this.behaviour.refuse ||
      !has(request.user, /\b(meet|meeting|schedule|call|sync|interview|discussion|1:1|catch[\s-]?up)\b/i)
    ) {
      return this.respond("I can't help with that — there is no meeting request in the text.", request, {
        refused: true,
        inputTokens,
      });
    }

    // Chapter 06 §06.10 — a truncation: the object is cut mid-string.
    if (this.behaviour.truncate) {
      return this.respond(`{"schemaVersion":"${SCHEMA_VERSION}","reasoning":"the user asked to`, request, {
        truncated: true,
        inputTokens,
      });
    }

    const attendeeMatch = request.user.match(/\bwith\s+([A-Za-z][\w'-]*)/i);
    const attendeeName = attendeeMatch?.[1]
      ? attendeeMatch[1][0]!.toUpperCase() + attendeeMatch[1].slice(1)
      : 'Unknown';
    const email = request.user.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
    const title =
      request.user.match(/\b(?:about|to discuss|regarding|re:)\s+([^.,;\n]+)/i)?.[1]?.trim().slice(0, 120) ??
      request.user
        .match(/\b(?:a|an|the)\s+([\w\s]{3,40}?)\s+(?:discussion|meeting|call|sync|interview|stand[\s-]?up)\s+with\b/i)?.[1]
        ?.trim() ??
      'Meeting';
    const location =
      request.user.match(/\b(?:in|at)\s+(?:the\s+)?(zoom|meeting room|office|cafe|hall|room \w+|floor \d+)/i)?.[1] ??
      null;
    const statedDuration = resolveDuration(request.user);
    const time = resolveTime(request.user);
    const startIso = `${resolveDate(request.user, this.now())}T${time ?? '09:00'}:00.000Z`;

    const kind = has(request.user, /\binterview\b/i)
      ? 'INTERVIEW'
      : has(request.user, /\b(team|stand[\s-]?up|all hands)\b/i)
        ? 'TEAM'
        : 'ONE_ON_ONE';

    // Chapter 03 §03.2 #7 and #9 — the two deliberate slips, on the first attempt only.
    const slipType =
      this.behaviour.enumDrift && has(request.user, /\b(one[\s-]?to[\s-]?one|1:1|1-1)\b/i) && !isRepairTurn;
    const slipDuration = this.behaviour.wrongType && statedDuration === null && !isRepairTurn;

    const payload = {
      schemaVersion: SCHEMA_VERSION,
      reasoning: `The words "${attendeeMatch?.[0] ?? 'with nobody'}" and "${time ?? 'no explicit time'}" drove this extraction.`,
      title,
      attendeeName,
      attendeeEmail: email,
      startIso,
      durationMinutes: slipDuration ? '30' : (statedDuration ?? 30),
      type: slipType ? 'one-to-one' : kind,
      timeZone: resolveTimeZone(request.user),
      location,
      needsHuman: statedDuration === null || time === null || email === null,
    };

    const json = JSON.stringify(payload);
    // Chapter 03 §03.2 #1 and #2 — prose and a fence, for the chatty behaviour.
    const text = this.behaviour.chatty ? `Sure! Here is the JSON you requested:\n\n\`\`\`json\n${json}\n\`\`\`` : json;

    return this.respond(text, request, { inputTokens });
  }

  private respond(
    text: string,
    request: CompletionRequest,
    options: { refused?: boolean; truncated?: boolean; inputTokens: number },
  ): ProviderResponse {
    return {
      text,
      refused: options.refused ?? false,
      truncated: options.truncated ?? false,
      inputTokens: options.inputTokens + estimateTokens(request.repair ?? ''),
      outputTokens: estimateTokens(text),
      finishReason: options.truncated ? 'length' : 'stop',
      enforcement: request.enforcement,
      model: this.model,
      provider: this.name,
    };
  }
}

/** Chapter 05 §05.11.1 — a named constructor, so the composition root reads well. */
export const createStubProvider = (options: StubProviderOptions = {}): ProviderPort => new StubProvider(options);

export { SYSTEM_PROMPT };

