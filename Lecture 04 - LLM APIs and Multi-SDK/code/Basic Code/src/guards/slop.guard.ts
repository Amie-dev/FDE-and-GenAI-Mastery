/**
 * Chapter 09 — AI slop and model collapse.
 * The deterministic half of the anti-slop checklist: filler phrases are countable,
 * so the screen is cheap, explainable and testable.
 */
const SLOP_PHRASES = [
  "as an ai language model",
  "in today's fast-paced world",
  'it is important to note that',
  'in conclusion,',
  'i hope this helps',
  'delve into',
];

export interface SlopReport {
  /** 0 = clean, 1 = every known filler phrase is present. */
  slopScore: number;
  hits: string[];
}

export const inspect = (text: string): SlopReport => {
  const lowerCased = text.toLowerCase();
  const hits = SLOP_PHRASES.filter((phrase) => lowerCased.includes(phrase));

  return { slopScore: Number((hits.length / SLOP_PHRASES.length).toFixed(2)), hits };
};
