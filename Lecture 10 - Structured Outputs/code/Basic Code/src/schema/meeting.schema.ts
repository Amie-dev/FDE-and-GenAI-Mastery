import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Chapter 02 §02.6 — ONE DECLARATION, THREE ARTEFACTS.
 *
 * This file is the single source of truth. From it we derive:
 *
 *   artefact 1  the TypeScript type        -> `export type Meeting = z.infer<...>`
 *   artefact 2  the runtime validator      -> the schema object itself (`safeParse`)
 *   artefact 3  the wire contract          -> `MEETING_JSON_SCHEMA`, sent to the model
 *
 * Maintain those three by hand and they WILL drift. The classic failure is a
 * hand-written interface, a hand-pasted JSON Schema in the prompt, and a
 * hand-written validator: three documents, three authors, three bugs.
 *
 * The schema is also a FORM the application writes (chapter 02 §02.3). The model
 * fills the values; it does not get to change the slots.
 */

/** Chapter 04 §04.12 rule 12 — a version stamp, so stored objects stay interpretable. */
export const SCHEMA_VERSION = 'meeting.v1';

/**
 * Chapter 04 §04.4 — the closed set, with an escape hatch.
 *
 * Without `OTHER` the model must lie when the input does not fit, and it will
 * pick the nearest wrong value.
 */
export const MEETING_TYPES = ['ONE_ON_ONE', 'INTERVIEW', 'TEAM', 'OTHER'] as const;

/**
 * The form.
 *
 * Chapter 04 rules applied, one by one:
 *   §04.12.3  flatten by default        -> one flat object, no nesting
 *   §04.12.4  enum every closed set      -> `type`
 *   §04.12.5  required + nullable        -> `attendeeEmail`, `location`
 *   §04.12.6  close every object         -> `.strict()`
 *   §04.12.7  constrain numbers and lists-> `min`/`max` on the duration
 *   §04.12.8  normalise strings          -> `datetime()`, `email()`
 *   §04.12.9  describe every field       -> `.describe()` everywhere
 *   §04.12.10 avoid unions               -> no `oneOf`/`anyOf`
 *   §04.12.11 bound the output size      -> `max()` on every string
 *   §04.12.12 version the schema         -> `schemaVersion` as a literal
 *   §04.10    reasoning field FIRST      -> `reasoning` is the first property
 */
export const MeetingSchema = z
  .object({
    /** §04.12.12 — a `const`-equivalent: exactly one allowed value. */
    schemaVersion: z.literal(SCHEMA_VERSION),

    /**
     * §04.10 — the reasoning-field pattern.
     *
     * Order is part of the contract: because these tokens are generated BEFORE
     * the labels, the labels are conditioned on an explicit analysis instead of
     * being a reflex. Put this field last and you get a justification, not an
     * influence.
     */
    reasoning: z
      .string()
      .min(1)
      .max(280)
      .describe('One sentence: which words in the input drove this extraction. Cite them.'),

    /** §04.7 — normalised, bounded free text. */
    title: z.string().min(1).max(120).describe('Short topic of the meeting. Not the whole input.'),

    attendeeName: z.string().min(1).max(80).describe('Full name of the other participant.'),

    /**
     * §04.9 — REQUIRED + NULLABLE, the default you should reach for.
     *
     * "This key is always present; its value may be null" is one testable rule.
     * "This key may be absent" forces `undefined` checks into every consumer.
     */
    attendeeEmail: z
      .string()
      .email()
      .nullable()
      .describe('Email address if it appears in the input, otherwise null. Never invent one.'),

    /** §04.7 — a resolved, sortable instant. Never "tomorrow". */
    startIso: z
      .string()
      .datetime()
      .describe('ISO 8601 start time with timezone. Resolve relative dates ("tomorrow") against TODAY.'),

    /** §04.8 — integer + bounds, and the unit lives in the NAME. */
    durationMinutes: z
      .number()
      .int()
      .min(5)
      .max(480)
      .describe('Duration in whole minutes. Default 30 when the input does not state one.'),

    type: z
      .enum(MEETING_TYPES)
      .describe('Meeting kind. Use OTHER when the input does not clearly fit the other values.'),

    location: z.string().max(120).nullable().describe('Place if stated, otherwise null.'),

    /** §04.14.1 — abstention is representable, so guessing is unnecessary. */
    needsHuman: z.boolean().describe('True when any field required a guess or is null.'),
  })
  .strict(); // §04.12.6 -> additionalProperties: false

/**
 * ARTEFACT 1 — the TypeScript type, DERIVED and never hand-written.
 *
 * If you also write `interface Meeting` by hand, you now have two truths.
 */
export type Meeting = z.infer<typeof MeetingSchema>;

/**
 * ARTEFACT 3 — the wire contract.
 *
 * `$refStrategy: 'none'` inlines every sub-schema: several providers dislike
 * `$ref`, and a `$ref`-heavy schema can fail to compile into a grammar
 * (chapter 05 §05.4.2). The `openAi` target emits the dialect that provider's
 * strict mode expects; other providers get their own generated variant — the
 * canonical schema above never changes.
 */
export const MEETING_JSON_SCHEMA = zodToJsonSchema(MeetingSchema, {
  $refStrategy: 'none',
  target: 'openAi',
});

/**
 * Chapter 05 §05.4.3 — THE SILENT LIMITS.
 *
 * A "strict" schema is not a semantically strict schema. The decoder enforces
 * structure (type · required · enum · closure); these keywords are frequently
 * accepted and IGNORED by the grammar, so the runtime validator is the only
 * guarantee for them:
 */
export const SILENT_LIMITS = [
  'minimum / maximum      -> validated by Zod, not by the decoder',
  'minLength / maxLength  -> validated by Zod, not by the decoder',
  'pattern                -> validated by Zod, not by the decoder',
  'format (email, date-time) -> validated by Zod, not by the decoder',
  'default                -> never applied by a decoder; apply it in code',
  'cross-field rules      -> impossible for a per-token grammar',
] as const;

/** §04.12.1 — why the schema avoids unions. Shown on /api/schema so the choice is visible. */
export const NO_UNIONS_REASON =
  'A union forces the model to make a TYPE decision, which is harder than a VALUE decision. ' +
  'Prefer a wide, flat, mostly-nullable object over a narrow union.';
