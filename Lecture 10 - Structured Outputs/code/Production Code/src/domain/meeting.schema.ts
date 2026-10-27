import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Chapter 02 §02.6 — THE CANONICAL SCHEMA.
 *
 * One declaration. Three artefacts. Plus, in production, a fourth concern that
 * the basic lab does not have: each provider enforces a DIFFERENT SUBSET of JSON
 * Schema (chapter 05 §05.4), so the canonical schema is compiled into
 * provider-specific wire contracts at build time rather than hand-maintained.
 *
 *   canonical schema  ──►  TypeScript type      (compile time)
 *                     ──►  runtime validator    (the boundary)
 *                     ──►  OpenAI wire variant   (strict mode, chapter 05 §05.4.2)
 *                     ──►  generic JSON Schema   (self-hosted / JSON mode)
 */

export const SCHEMA_VERSION = 'meeting.v1' as const;

/** Chapter 04 §04.4 — the closed set, with an escape hatch. */
export const MEETING_TYPES = ['ONE_ON_ONE', 'INTERVIEW', 'TEAM', 'OTHER'] as const;

/** Chapter 04 §04.5.1 — the depth tax is real; production schemas stay flat. */
export const MAX_TITLE_LENGTH = 120;
export const MAX_REASONING_LENGTH = 280;
export const MAX_LOCATION_LENGTH = 120;
export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 480;

export const MeetingSchema = z
  .object({
    /** §04.12.12 — a `const`: exactly one allowed value. */
    schemaVersion: z.literal(SCHEMA_VERSION),

    /** §04.10 — the reasoning field comes FIRST, and its length is capped. */
    reasoning: z
      .string()
      .min(1)
      .max(MAX_REASONING_LENGTH)
      .describe('One sentence citing the words in the input that drove this extraction.'),

    /** §04.12.11 — bounded free text. */
    title: z.string().min(1).max(MAX_TITLE_LENGTH).describe('Short topic of the meeting.'),

    attendeeName: z.string().min(1).max(80).describe('Full name of the other participant.'),

    /** §04.9 — required + nullable. The default you should reach for. */
    attendeeEmail: z
      .string()
      .email()
      .nullable()
      .describe('Email if present in the input, otherwise null. Never invent one.'),

    /** §04.7 — a resolved instant, never a relative phrase. */
    startIso: z
      .string()
      .datetime()
      .describe('ISO 8601 start time. Resolve relative dates ("tomorrow") against TODAY.'),

    /** §04.8 — integer, bounded, and the unit is in the NAME. */
    durationMinutes: z
      .number()
      .int()
      .min(MIN_DURATION_MINUTES)
      .max(MAX_DURATION_MINUTES)
      .describe('Duration in whole minutes.'),

    type: z.enum(MEETING_TYPES).describe('Meeting kind. Use OTHER when nothing else clearly fits.'),

    /** §04.7 — an IANA zone, so the instant is unambiguous. */
    timeZone: z.string().min(1).max(64).describe('IANA time zone, e.g. Asia/Kolkata.'),

    location: z.string().max(MAX_LOCATION_LENGTH).nullable().describe('Place if stated, else null.'),

    /** §04.14.1 — abstention is representable, so guessing is unnecessary. */
    needsHuman: z.boolean().describe('True when any field was guessed or is null.'),
  })
  .strict(); // §04.12.6 -> additionalProperties: false

/** ARTEFACT 1 — derived, never hand-written. */
export type Meeting = z.infer<typeof MeetingSchema>;

/**
 * Chapter 05 §05.4.5 — PROVIDER-SPECIFIC WIRE CONTRACTS.
 *
 * `$refStrategy: 'none'` because several providers dislike `$ref` and a
 * `$ref`-heavy schema can fail to compile into a grammar (chapter 05 §05.4.2).
 */
export const WIRE_SCHEMAS = Object.freeze({
  /** Strict mode: the dialect OpenAI-family providers expect. */
  openai: zodToJsonSchema(MeetingSchema, { $refStrategy: 'none', target: 'openAi' }),
  /** A neutral JSON Schema, for self-hosted guided decoding and documentation. */
  generic: zodToJsonSchema(MeetingSchema, { $refStrategy: 'none', target: 'jsonSchema2019-09' }),
});

export type WireTarget = keyof typeof WIRE_SCHEMAS;

/**
 * Chapter 05 §05.4.3 — THE SILENT LIMITS, as a machine-readable list.
 *
 * Everything here is enforced by Zod and NOT by the decoder. Surfacing it on
 * `/api/schema` means the claim is verifiable at runtime rather than buried in a
 * wiki page.
 */
export const SILENT_LIMITS = Object.freeze([
  { keyword: 'minimum / maximum', enforcedBy: 'validator', note: 'the decoder enforces structure, not ranges' },
  { keyword: 'minLength / maxLength', enforcedBy: 'validator', note: 'bounding is a value predicate' },
  { keyword: 'format (email, date-time)', enforcedBy: 'validator', note: 'usually annotation-only' },
  { keyword: 'pattern', enforcedBy: 'validator', note: 'sometimes partially enforced, never relied upon' },
  { keyword: 'default', enforcedBy: 'code', note: 'a decoder never applies defaults' },
  { keyword: 'cross-field rules', enforcedBy: 'semantic rules', note: 'impossible for a per-token grammar' },
]);

/**
 * Chapter 09 §09.2 — the version stamp that makes traces attributable.
 * Kept next to the schema so the two cannot drift.
 */
export const SCHEMA_FINGERPRINT = JSON.stringify(WIRE_SCHEMAS.openai).length;
