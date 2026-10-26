import type { DecodingSettings, Vector } from "../types";
import { argmax, percent, rng, round, softmax } from "./attentionService";

/**
 * Chapter 08 - decoding strategies and sampling controls.
 *
 * The chapter's central claim, and the reason this file exists separately from
 * logitsService: the MODEL never selects a token. It proposes a distribution.
 * Everything in here happens outside the network, which is why you can change
 * temperature, top-p and penalties without touching a single weight (§08.1).
 *
 * The order below is fixed, because the operations do not commute (§08.10):
 *   penalties -> temperature -> softmax -> top-k -> top-p -> min-p -> renormalise -> draw
 */

/** §08.5 - temperature divides the logits. It changes the GAPS, never the ranking. */
export function temperaturePanel(logits: Vector, temperature: number) {
  const scaled = logits.map((value) => round(value / temperature, 4));
  const probabilities = softmax(scaled);
  return {
    temperature,
    scaled,
    probabilities,
    percent: probabilities.map((value) => percent(value)),
    shape: temperature === 0 ? "greedy" : temperature < 1 ? "sharp" : temperature === 1 ? "the model's own distribution" : "flat",
  };
}

/** §08.5 - the lecture's three cases, side by side. */
export function lectureTemperature() {
  const tokens = ["Python", "Java", "JavaScript", "C++", "Rust"];
  const logits = [5, 4, 3, 2, 1];
  const panels = [0.5, 1.0, 2.0].map((temperature) => temperaturePanel(logits, temperature));

  return {
    tokens,
    rawLogits: logits,
    panels,
    table: tokens.map((token, i) => ({
      token,
      t0_5: percent(panels[0].probabilities[i]),
      t1_0: percent(panels[1].probabilities[i]),
      t2_0: percent(panels[2].probabilities[i]),
    })),
    boundaries: {
      tZero: "T = 0 is greedy decoding - the softmax approaches a one-hot row",
      tInfinity: "T -> infinity approaches a uniform distribution: random noise, whatever the model learned",
      ranking: "temperature never changes WHICH token is most likely, only how much more likely it is",
    },
  };
}

/** §08.6 - top-k: keep the k most likely tokens, zero the rest. */
export function keepTopK(probabilities: Vector, k: number): Vector {
  const cutoff = [...probabilities].sort((a, b) => b - a)[Math.min(k, probabilities.length) - 1];
  return probabilities.map((value) => (value >= cutoff ? value : 0));
}

/**
 * §08.7 - top-p (nucleus): keep the smallest set of tokens whose cumulative
 * probability reaches p. This is the one that adapts to the shape of the
 * distribution, which is why it beats a fixed k as a general default.
 */
export function keepNucleus(probabilities: Vector, p: number): Vector {
  const order = probabilities.map((value, id) => ({ value, id })).sort((a, b) => b.value - a.value);
  const kept = new Set<number>();
  let cumulative = 0;
  for (const { value, id } of order) {
    kept.add(id);
    cumulative += value;
    if (cumulative >= p) break;
  }
  return probabilities.map((value, id) => (kept.has(id) ? value : 0));
}

/** §08.8 - min-p: keep tokens at least minP x the leader. Relative, so it self-adjusts. */
export function keepAboveRelative(probabilities: Vector, minP: number): Vector {
  const threshold = minP * Math.max(...probabilities);
  return probabilities.map((value) => (value >= threshold ? value : 0));
}

/** Bring the surviving pool back to a valid distribution (it must sum to 1). */
export function renormalise(probabilities: Vector): Vector {
  const total = probabilities.reduce((sum, value) => sum + value, 0);
  return total === 0 ? probabilities.map(() => 0) : probabilities.map((value) => round(value / total, 6));
}

/** §08.4 - the weighted lottery. One uniform draw against the cumulative curve. */
export function weightedDraw(probabilities: Vector, draw: number): number {
  let cumulative = 0;
  for (let id = 0; id < probabilities.length; id++) {
    cumulative += probabilities[id];
    if (draw < cumulative) return id;
  }
  return probabilities.length - 1;
}

/** §08.9 - penalties modify logits from what has already been generated. */
export function applyPenalties(logits: Vector, counts: Map<number, number>, settings: DecodingSettings) {
  const adjusted = logits.slice();
  for (const [id, count] of counts) {
    if (settings.presencePenalty) adjusted[id] -= settings.presencePenalty;
    if (settings.frequencyPenalty) adjusted[id] -= settings.frequencyPenalty * count;
    if (settings.repetitionPenalty !== 1) {
      adjusted[id] =
        adjusted[id] > 0 ? adjusted[id] / settings.repetitionPenalty : adjusted[id] * settings.repetitionPenalty;
    }
  }
  return adjusted;
}

/** Count how many times each id already appears in the output (§08.9). */
export function countTokens(ids: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

/**
 * §08.10 - the whole decode step, in the order that matters. Every provider runs
 * a variant of this function; the parameters differ, the shape does not.
 */
export function decodeStep(logits: Vector, generated: number[], settings: DecodingSettings) {
  const trace: { step: string; note: string }[] = [];
  let z = logits.slice();

  // 1. penalties - they depend on what has already been produced
  const counts = countTokens(generated);
  z = applyPenalties(z, counts, settings);
  trace.push({ step: "penalties", note: `${counts.size} distinct token(s) already generated` });

  // 2. temperature, and the T = 0 shortcut straight to argmax
  if (settings.temperature === 0) {
    const picked = argmax(z);
    return { selected: picked, mode: "greedy", trace, poolSize: 1, distribution: null };
  }
  z = z.map((value) => round(value / settings.temperature, 6));
  trace.push({ step: "temperature", note: `logits divided by ${settings.temperature}` });

  // 3. softmax - the trimming below works on PROBABILITIES, so temperature is baked in
  let probabilities = softmax(z);
  trace.push({ step: "softmax", note: "logits -> a valid distribution" });

  // 4. trim the pool
  if (settings.topK) {
    probabilities = keepTopK(probabilities, settings.topK);
    trace.push({ step: "top-k", note: `kept the ${settings.topK} most likely` });
  }
  if (settings.topP) {
    probabilities = keepNucleus(probabilities, settings.topP);
    trace.push({ step: "top-p", note: `kept the smallest set reaching ${settings.topP}` });
  }
  if (settings.minP) {
    probabilities = keepAboveRelative(probabilities, settings.minP);
    trace.push({ step: "min-p", note: `kept tokens at least ${settings.minP} x the leader` });
  }

  // 5. renormalise, then draw
  const pool = renormalise(probabilities);
  const poolSize = pool.filter((value) => value > 0).length;
  const draw = rng(settings.seed)();
  const selected = settings.strategy === "greedy" ? argmax(z) : weightedDraw(pool, draw);
  trace.push({ step: "draw", note: `one uniform value (${round(draw, 4)}) against the cumulative curve` });

  return { selected, mode: settings.strategy, trace, poolSize, distribution: pool };
}

/** §08.2 - greedy: always the highest. Deterministic, and prone to loops. */
export function greedy(logits: Vector) {
  const id = argmax(logits);
  return {
    strategy: "greedy",
    selected: id,
    probability: percent(softmax(logits)[id]),
    note: "identical input gives identical output every time; no temperature, no seed, no variance (§08.2)",
  };
}

/**
 * §08.3 - beam search: keep the `width` best partial sequences instead of one.
 * `steps` holds one logits vector per position. Scores are sums of log
 * probabilities, because adding logs multiplies probabilities without underflow.
 */
export function beamSearch(steps: Vector[], width: number) {
  type Beam = { ids: number[]; score: number };
  let beams: Beam[] = [{ ids: [], score: 0 }];

  for (const logits of steps) {
    // Adding logs multiplies probabilities without underflowing.
    const logs = softmax(logits).map((value) => Math.log(Math.max(value, 1e-12)));
    const candidates: Beam[] = [];

    for (const beam of beams) {
      for (let id = 0; id < logits.length; id++) {
        candidates.push({ ids: [...beam.ids, id], score: round(beam.score + logs[id], 6) });
      }
    }

    beams = candidates.sort((a, b) => b.score - a.score).slice(0, width);
  }

  return {
    width,
    beams: beams.map((beam) => ({
      ids: beam.ids,
      score: beam.score,
      lengthNormalised: round(beam.score / Math.max(beam.ids.length, 1), 6),
    })),
    note:
      "Beam search explores `width` continuations at once. The score must be normalised by length, or it always " +
      "prefers shorter sequences (§08.3). It buys fluency, not factuality.",
  };
}

/** §08.7 - the lecture's cumulative table, computed so the boundary is visible. */
export function nucleusExample() {
  const distribution = [0.42, 0.26, 0.13, 0.08, 0.05, 0.03, 0.02, 0.01];
  const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
  let cumulative = 0;
  const rows = distribution.map((value, i) => {
    cumulative = round(cumulative + value, 4);
    return { token: labels[i], probability: value, cumulative };
  });
  return {
    p: 0.9,
    rows,
    nucleus: rows.filter((row) => row.cumulative - row.probability < 0.9).map((row) => row.token),
    note: "the p = 0.9 boundary falls inside E, so the nucleus is {A,B,C,D,E}; the rest is zeroed and the pool renormalised",
  };
}

/** §08.13 - parameter sets that work, per task. */
export function recipes() {
  return [
    { task: "code / math / extraction", temperature: "0 - 0.3", topP: "1.0", note: "near-deterministic; verify with a schema, not with hope" },
    { task: "factual Q&A", temperature: "0.2", topP: "0.9", note: "small amount of variety, no wandering" },
    { task: "technical writing / summarising", temperature: "0.5 - 0.8", topP: "0.9", note: "the general-purpose sweet spot" },
    { task: "chat baseline", temperature: "1.0", topP: "0.95", note: "the model's own distribution" },
    { task: "creative writing / brainstorming", temperature: "1.2 - 1.5", topP: "0.95 - 0.98", note: "raise temperature, then raise top-p to match" },
  ];
}

/** §08.12 - why the UI types. */
export function streamingNote() {
  return {
    why: "the decode loop emits one token at a time, so the first token can be sent before the last one exists",
    effect: "time-to-first-token becomes the number the user feels, not total latency",
    caveat: "stop sequences and penalties still need the full buffer, so a streamed response can still be cut short",
  };
}

