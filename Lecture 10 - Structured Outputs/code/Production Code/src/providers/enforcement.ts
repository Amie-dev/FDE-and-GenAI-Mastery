import { ENFORCEMENT_LADDER, config, type EnforcementName } from '../config/env.js';

/**
 * Chapter 04 §04.4 / chapter 05 §05.5.1 — THE ENFORCEMENT CAPABILITY REGISTRY.
 *
 * The basic lab answered "which enforcement do I have?" with an if/else. In
 * production that answer must be DATA, for three reasons:
 *
 *   1. it is per MODEL, not per provider — a family's cheap model often lacks the
 *      strict-schema flag its flagship has (chapter 05 §05.5.1);
 *   2. it must be testable — a capability claim is a fact you can assert on;
 *   3. it must degrade gracefully — an unknown model falls back to the strongest
 *      rung that is universally available, never to an error.
 */

export interface EnforcementCapability {
  readonly rung: EnforcementName;
  /** Chapter 05 §05.4.2 — does this rung compile the structural keywords? */
  readonly structuralKeywordsEnforced: boolean;
  /** Chapter 05 §05.4.3 — does it enforce value predicates? (Never, in practice.) */
  readonly valueKeywordsEnforced: boolean;
  readonly note: string;
}

/**
 * The semantics of each rung, written ONCE. Every provider entry below references
 * these, so a rung's guarantee can never be described inconsistently in two places.
 */
export const ENFORCEMENT_CAPABILITIES: Readonly<Record<EnforcementName, EnforcementCapability>> = Object.freeze({
  native_schema: {
    rung: 'native_schema',
    structuralKeywordsEnforced: true,
    valueKeywordsEnforced: false,
    note: 'Schema passed to the API and compiled into a grammar. Shape by construction; values still need the validator.',
  },
  tool_use: {
    rung: 'tool_use',
    structuralKeywordsEnforced: true,
    valueKeywordsEnforced: false,
    note: 'A forced single tool call whose parameters are the schema. Arguments arrive as a JSON string and must be parsed.',
  },
  json_mode: {
    rung: 'json_mode',
    structuralKeywordsEnforced: false,
    valueKeywordsEnforced: false,
    note: 'Any valid JSON object. A parser guarantee, not a contract guarantee (chapter 03 §03.9).',
  },
  instruction: {
    rung: 'instruction',
    structuralKeywordsEnforced: false,
    valueKeywordsEnforced: false,
    note: 'A preference over a probability distribution. Guarantees nothing; validate everything.',
  },
});

/** What a specific provider + model actually offers. Ordered strongest first. */
export interface ModelCapabilities {
  readonly provider: string;
  readonly modelPattern: RegExp;
  readonly supported: readonly EnforcementName[];
  readonly rationale: string;
}

/**
 * Chapter 05 §05.5 — the landscape as configuration.
 *
 * These are CATEGORIES with concrete examples, not eternal truths. A provider
 * ships a capability and this table gains a row; that is a one-line change, and
 * the rest of the service is unaffected.
 */
export const MODEL_CAPABILITIES: readonly ModelCapabilities[] = Object.freeze([
  {
    provider: 'openai',
    modelPattern: /^(gpt-4o|gpt-4\.1|gpt-5|o[134])/i,
    supported: ['native_schema', 'json_mode', 'instruction'],
    rationale: 'Hosted frontier models with native structured outputs (schema + strict flag).',
  },
  {
    provider: 'openai',
    modelPattern: /.*/,
    supported: ['json_mode', 'instruction'],
    rationale: 'Older or smaller OpenAI-family models: JSON mode only.',
  },
  {
    provider: 'groq',
    modelPattern: /.*/,
    supported: ['json_mode', 'instruction'],
    rationale: 'OpenAI-compatible endpoint; schema enforcement is not guaranteed, so JSON mode is the ceiling.',
  },
  {
    provider: 'ollama',
    modelPattern: /.*/,
    supported: ['json_mode', 'instruction'],
    rationale: 'Self-hosted: guided decoding is a server concern, so the application falls back to JSON mode.',
  },
  {
    provider: 'stub',
    modelPattern: /.*/,
    supported: ['native_schema', 'tool_use', 'json_mode', 'instruction'],
    rationale: 'Deterministic offline provider: it can emulate any rung, which is what makes the metrics table possible.',
  },
]);

/** Chapter 04 §04.4 — the strongest rung a model supports, by ladder order. */
export const supportedFor = (provider: string, model: string): ModelCapabilities => {
  const matches = MODEL_CAPABILITIES.filter((entry) => entry.provider === provider && entry.modelPattern.test(model));
  // The first matching entry wins, so the table is ordered most-specific-first.
  return (
    matches[0] ?? {
      provider,
      modelPattern: /.*/,
      supported: ['json_mode', 'instruction'],
      rationale: 'Unknown provider: degrade to the strongest universally available rung.',
    }
  );
};

/** Chapter 04 §04.4 — the ladder order decides "strongest", not the array order. */
export const strongestOf = (supported: readonly EnforcementName[]): EnforcementName =>
  ENFORCEMENT_LADDER.find((rung) => supported.includes(rung)) ?? 'instruction';

export interface EnforcementDecision {
  readonly rung: EnforcementName;
  readonly capability: EnforcementCapability;
  readonly rationale: string;
  /** True when the configured `ENFORCEMENT` could not be honoured. */
  readonly downgraded: boolean;
}

/**
 * Chapter 04 §04.4 — choose, and explain.
 *
 * Two behaviours worth stating:
 *   - an explicit `ENFORCEMENT` is honoured when supported, and DOWNGRADED (not
 *     rejected) when it is not — with `downgraded: true` so the operator can
 *     alert on it;
 *   - `auto` always takes the strongest available rung.
 *
 * The `downgraded` flag is the production detail the basic lab lacks: silently
 * running on a weaker rung than requested is exactly the kind of invisible
 * configuration drift chapter 09 §09.8.1 tells you to make attributable.
 */
export const decideEnforcement = (provider: string, model: string): EnforcementDecision => {
  const { supported, rationale } = supportedFor(provider, model);
  const strongest = strongestOf(supported);

  if (config.ENFORCEMENT === 'auto') {
    return { rung: strongest, capability: ENFORCEMENT_CAPABILITIES[strongest], rationale, downgraded: false };
  }

  const requested = config.ENFORCEMENT;
  if (supported.includes(requested)) {
    return {
      rung: requested,
      capability: ENFORCEMENT_CAPABILITIES[requested],
      rationale: `ENFORCEMENT=${requested} is supported by ${provider}/${model}.`,
      downgraded: false,
    };
  }

  return {
    rung: strongest,
    capability: ENFORCEMENT_CAPABILITIES[strongest],
    rationale: `ENFORCEMENT=${requested} is NOT supported by ${provider}/${model}; downgraded to ${strongest}. ${rationale}`,
    downgraded: true,
  };
};

