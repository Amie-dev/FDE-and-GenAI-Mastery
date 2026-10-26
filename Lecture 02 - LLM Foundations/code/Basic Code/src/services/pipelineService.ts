import { config } from "../config/config";
import type { Logits, TokenId } from "../types";
import { count } from "./countService";
import { embedAll, preview } from "./embeddingService";
import { inputPipeline, trainedLengthWarning } from "./positionalService";
import { VOCAB_SIZE, decode, encode, isSpecial, normalize, pieceOf, tokenize } from "./tokenizerService";

/**
 * Chapter 01 - an LLM is a next-token probability machine:
 *
 *     P(t_n | t_1 ... t_{n-1})
 *
 * The TOKENIZER here is real (js-tiktoken, the same tables the models use). The MODEL is
 * a bigram table counted from a tiny corpus: it scores every id in the vocabulary,
 * softmax turns those scores into probabilities, and a decoding strategy picks exactly
 * one. A real LLM swaps the table for a transformer - everything around it, including
 * the loop below, is identical.
 */

/** The entire training corpus of our stand-in model. */
export const DEMO_CORPUS: string[] = [
  "the capital of india is delhi .",
  "the capital of india is delhi .", // twice, so the distribution comes out PEAKED (§01.6)
  "the capital of france is paris .",
  "the cat sat on the mat .",
  "hello i am aminul .",
];

/**
 * A floor logit: every id in the vocabulary gets a score, so the softmax is over the
 * whole vocabulary and not just over the ids the corpus happened to show (§01.6).
 * -30 is small enough that the floor mass never distorts the real candidates.
 */
const FLOOR_LOGIT = -30;

type Counts = Map<TokenId, Map<TokenId, number>>;

function addCount(counts: Counts, from: TokenId, to: TokenId): void {
  const row = counts.get(from) ?? new Map<TokenId, number>();
  row.set(to, (row.get(to) ?? 0) + 1);
  counts.set(from, row);
}

/**
 * "Training": count which id follows which. This is the same loop as §08.9 - forward
 * pass, compare with the next token, update the weights - only the update here is a
 * counter instead of a gradient step. Note that the corpus is tokenized by the REAL
 * tokenizer, so the counts are over real ids.
 */
export function buildModel(corpus: string[]): Counts {
  const counts: Counts = new Map();
  for (const sentence of corpus) {
    const ids = encode(sentence).ids;
    for (let i = 0; i < ids.length - 1; i++) addCount(counts, ids[i], ids[i + 1]);
  }
  return counts;
}

/** The weights. In memory only - and changed by POST /pipeline/training-step. */
export const MODEL: Counts = buildModel(DEMO_CORPUS);

/**
 * The forward pass: one logit per vocabulary entry - 199,998 numbers for o200k_base.
 * Only the LAST position's logits are used to pick the next token (§02.6, step 7).
 */
export function forward(context: TokenId[]): Logits {
  const logits: Logits = new Array(VOCAB_SIZE).fill(FLOOR_LOGIT);
  const last = context[context.length - 1];
  const row = MODEL.get(last);
  if (row) for (const [id, times] of row) logits[id] = Math.log(times) + 2;
  return logits;
}

/**
 * Softmax, written out so "logits -> probabilities" is not a black box (Lecture 03 has
 * the maths). The maximum is found with a loop, not with Math.max(...logits): spreading
 * 200k arguments would blow the call stack, which is a real bug in real code.
 */
export function softmax(logits: Logits): number[] {
  let max = -Infinity;
  for (const value of logits) if (value > max) max = value;

  let total = 0;
  const exps = logits.map((value) => {
    const exp = Math.exp(value - max); // subtract the max so exp() cannot overflow
    total += exp;
    return exp;
  });
  return exps.map((value) => value / total);
}

/** The decoding strategy: greedy, the simplest one. Temperature and top-p are Lecture 03. */
function pickGreedy(probabilities: number[]): TokenId {
  let best = 0;
  for (let id = 1; id < probabilities.length; id++) {
    if (probabilities[id] > probabilities[best]) best = id;
  }
  return best;
}

/**
 * The head of a distribution - this is the §01.6 table, computed instead of typed.
 * One pass keeps the best `size` ids, so a 200k-entry array is never sorted.
 */
function topScores(probabilities: number[], size = 5): { token: string; id: number; probability: number }[] {
  const best: number[] = [];
  for (let id = 0; id < probabilities.length; id++) {
    if (best.length < size) {
      best.push(id);
      continue;
    }
    let lowest = 0;
    for (let i = 1; i < best.length; i++) if (probabilities[best[i]] < probabilities[best[lowest]]) lowest = i;
    if (probabilities[id] > probabilities[best[lowest]]) best[lowest] = id;
  }

  return best
    .map((id) => ({ token: pieceOf(id), id, probability: Number(probabilities[id].toFixed(6)) }))
    .filter((entry) => entry.probability > 1e-9) // drop the floor: it is not a real candidate
    .sort((a, b) => b.probability - a.probability);
}

export type Stage = { stage: string; detail: unknown };

/** The stages of §02.6 and §08.7, run once on a prompt so you can watch each one. */
export function runPipeline(text: string) {
  const encoded = encode(text);
  const tokens = tokenize(text); // stage 1-2: the real tokenizer
  const ids = encoded.ids; // stage 3: ids are labels, not measurements
  const vectors = embedAll(ids); // stage 4: embedding lookup W_emb[id]
  const inputMatrix = inputPipeline(ids, vectors, config.dModel); // stage 5: E + P
  const logits = forward(ids); // stage 6: forward pass
  const probabilities = softmax(logits); // stage 7
  const chosen = pickGreedy(probabilities); // stage 8

  const stages: Stage[] = [
    { stage: "1-2 tokenize (real BPE)", detail: { encoding: encoded.encoding, tokens } },
    { stage: "3 vocabulary lookup", detail: { ids, note: "ids mean nothing without this encoding" } },
    { stage: "4 count tokens", detail: count(text) },
    { stage: "5 embedding lookup", detail: { shape: [ids.length, config.dModel], firstRow: preview(vectors[0] ?? []) } },
    { stage: "6 add positional encoding", detail: { shape: [inputMatrix.length, config.dModel], firstRow: preview(inputMatrix[0] ?? []) } },
    { stage: "7 forward pass -> logits", detail: { vocabularySize: logits.length, top5: topScores(logits) } },
    {
      stage: "8 softmax -> probabilities",
      detail: { sumsTo: Number(probabilities.reduce((sum, value) => sum + value, 0).toFixed(6)), top5: topScores(probabilities) },
    },
    { stage: "9 greedy pick", detail: { token: pieceOf(chosen), id: chosen } },
  ];

  return {
    text,
    encoding: encoded.encoding,
    exact: encoded.exact,
    roundTripMatches: encoded.roundTripMatches,
    inputShape: [ids.length, config.dModel] as [number, number],
    nextToken: { token: pieceOf(chosen), id: chosen },
    stages,
    note: "The stand-in model reads only the last token id, so stages 5-6 exist to show the shape a real transformer consumes. Every stage still runs, so the trace is complete.",
  };
}

export type GenerationStep = {
  step: number;
  positionsProcessed: number;
  context: string;
  chosen: string;
  chosenId: number;
  probability: number;
  top5: { token: string; id: number; probability: number }[];
};

/**
 * Below this, the pick is not a decision: it is the floor logit, i.e. the context was
 * never seen in the corpus and the distribution is (almost) uniform - 1/199,998 for
 * o200k_base. Generation stops instead of inventing a token.
 */
const MIN_PROBABILITY = 1e-3;

/** The autoregressive loop of §01.7: one full forward pass per generated token. */
export function generate(prompt: string, maxTokens: number) {
  const promptIds = encode(prompt).ids;
  const context: TokenId[] = [...promptIds];
  const output: TokenId[] = [];
  const steps: GenerationStep[] = [];
  let stoppedBecause: string | null = null;

  for (let step = 0; step < maxTokens; step++) {
    // Chapters 06-07 run every step: this is the matrix the transformer blocks consume.
    const inputMatrix = inputPipeline(context, embedAll(context), config.dModel);

    const probabilities = softmax(forward(context)); // ONE full forward pass per generated token
    const chosen = pickGreedy(probabilities); // greedy; temperature and top-p are Lecture 03

    if (isSpecial(chosen)) {
      stoppedBecause = "the model emitted a special token (<|endoftext|>)";
      break;
    }
    if (probabilities[chosen] < MIN_PROBABILITY) {
      stoppedBecause = `no observed continuation after ${JSON.stringify(decode(context))}: the distribution is flat, so every token in the vocabulary is equally likely.`;
      break;
    }

    steps.push({
      step: step + 1,
      positionsProcessed: inputMatrix.length,
      context: decode(context),
      chosen: pieceOf(chosen),
      chosenId: chosen,
      probability: Number(probabilities[chosen].toFixed(6)),
      top5: topScores(probabilities),
    });

    output.push(chosen);
    context.push(chosen); // autoregressive: the output becomes the input
  }

  return {
    prompt,
    mode: "inference",
    weightsFrozen: true,
    promptTokens: promptIds.length,
    output: decode(output),
    outputTokens: output.length,
    steps,
    stoppedBecause,
    guardRail: trainedLengthWarning(promptIds.length, config.model(config.defaultModel).contextWindow),
    cost: {
      forwardPasses: output.length,
      note: "One full forward pass per generated token, and the sequence grows by one each step - that is why output tokens dominate latency and cost (§01.7).",
    },
  };
}

export type TrainingPosition = {
  position: number;
  context: string;
  label: string;
  probability: number;
  loss: number;
};

/**
 * §08.4 and §08.9 - one training step. The label is free: it is the next token of the
 * same sentence, which is the whole trick behind pre-training.
 */
export function trainingStep(text: string) {
  const ids = encode(text).ids;
  const positions: TrainingPosition[] = [];
  let totalLoss = 0;

  for (let i = 0; i < ids.length - 1; i++) {
    const probabilities = softmax(forward(ids.slice(0, i + 1))); // a real model does all positions at once
    const label = ids[i + 1]; // the label, free of charge
    const probability = Math.max(probabilities[label], 1e-12); // an unseen transition is not free
    const loss = -Math.log(probability); // cross-entropy for this position
    totalLoss += loss;

    positions.push({
      position: i + 1,
      context: decode(ids.slice(0, i + 1)),
      label: pieceOf(label),
      probability: Number(probability.toFixed(6)),
      loss: Number(loss.toFixed(4)),
    });
  }

  // The update step: remember the pairs we just saw. A real model runs backward() and moves every weight.
  for (let i = 0; i < ids.length - 1; i++) addCount(MODEL, ids[i], ids[i + 1]);

  return {
    text,
    encoding: encode(text).encoding,
    mode: "training",
    weightsUpdated: true,
    positions,
    averageLoss: Number((totalLoss / Math.max(positions.length, 1)).toFixed(4)),
    update: "Observed pairs added to the bigram counts. A real LLM runs backward() and moves every weight (§08.9).",
    note: "Send the same text twice: the loss falls the second time, because the weights moved. Prompting never does that.",
  };
}
