import { config } from "../config/config";
import type { Logits, TokenId } from "../types";
import { count } from "./countService";
import { embedAll, preview } from "./embeddingService";
import { inputPipeline, trainedLengthWarning } from "./positionalService";
import { SPECIAL, VOCAB_SIZE, decode, encode, idOf, pieceOf, tokenize, toIds } from "./tokenizerService";

/**
 * Chapter 01 - an LLM is a next-token probability machine:
 *
 *     P(t_n | t_1 ... t_{n-1})
 *
 * The "model" here is a bigram table counted from a tiny corpus. It scores EVERY
 * token in the vocabulary (§01.6), softmax turns those scores into probabilities,
 * and a decoding strategy picks exactly one. A real LLM swaps the table for a
 * transformer - everything around it, including the loop below, is identical.
 */

/** The entire training corpus of our stand-in model. */
export const DEMO_CORPUS: string[] = [
  "the capital of india is delhi .",
  "the capital of india is delhi .", // twice, so the distribution comes out PEAKED (§01.6)
  "the capital of france is paris .",
  "the cat sat on the mat .",
  "hello i am aminul .",
];

/** A floor logit, so every token gets a score - even "banana", at an absurdly small one (§01.6). */
const FLOOR_LOGIT = -10;

type Counts = Map<TokenId, Map<TokenId, number>>;

function addCount(counts: Counts, from: TokenId, to: TokenId): void {
  const row = counts.get(from) ?? new Map<TokenId, number>();
  row.set(to, (row.get(to) ?? 0) + 1);
  counts.set(from, row);
}

/**
 * "Training": count which token follows which. This is the same loop as §08.9 -
 * forward pass, compare with the next token, update the weights - only the update
 * here is a counter instead of a gradient step.
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
 * The forward pass: one logit per vocabulary entry. Only the LAST position's
 * logits are used to pick the next token (§02.6, step 7).
 */
export function forward(context: TokenId[]): Logits {
  const logits: Logits = new Array(VOCAB_SIZE).fill(FLOOR_LOGIT);
  const last = context[context.length - 1];
  const row = MODEL.get(last);
  if (row) for (const [id, times] of row) logits[id] = Math.log(times) + 2;
  return logits;
}

/** Softmax, written out so "logits -> probabilities" is not a black box (Lecture 03 has the maths). */
export function softmax(logits: Logits): number[] {
  const max = Math.max(...logits); // subtract the max so exp() cannot overflow
  const exps = logits.map((value) => Math.exp(value - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
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

/** The head of a distribution - this is the §01.6 table, computed instead of typed. */
function topScores(scores: number[], size = 5): { token: string; id: number; score: number }[] {
  return scores
    .map((score, id) => ({ token: pieceOf(id), id, score: Number(score.toFixed(6)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, size);
}

export type Stage = { stage: string; detail: unknown };

/** The eight stages of §02.6 and §08.7, run once on a prompt so you can watch each one. */
export function runPipeline(text: string) {
  const tokens = tokenize(text); // stage 1-2
  const ids = toIds(tokens); // stage 3
  const vectors = embedAll(ids); // stage 4: embedding lookup
  const inputMatrix = inputPipeline(ids, vectors, config.dModel); // stage 5: add positions
  const logits = forward(ids); // stage 6: forward pass
  const probabilities = softmax(logits); // stage 7
  const chosen = pickGreedy(probabilities); // stage 8

  const stages: Stage[] = [
    { stage: "1-2 normalise and tokenize", detail: tokens },
    { stage: "3 vocabulary lookup", detail: ids },
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
  probability: number;
  top5: { token: string; id: number; score: number }[];
};

/** The autoregressive loop of §01.7: one full forward pass per generated token. */
export function generate(prompt: string, maxTokens: number) {
  const promptIds = encode(prompt).ids;
  const context: TokenId[] = [...promptIds];
  const output: TokenId[] = [];
  const steps: GenerationStep[] = [];

  for (let step = 0; step < maxTokens; step++) {
    // Chapters 06-07 run every step: this is the matrix the transformer blocks consume.
    const inputMatrix = inputPipeline(context, embedAll(context), config.dModel);

    const probabilities = softmax(forward(context)); // ONE full forward pass per generated token
    const chosen = pickGreedy(probabilities); // greedy; temperature and top-p are Lecture 03
    if (chosen === idOf(SPECIAL.EOS)) break; // the model decided to stop

    steps.push({
      step: step + 1,
      positionsProcessed: inputMatrix.length,
      context: decode(context),
      chosen: pieceOf(chosen),
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
 * §08.4 and §08.9 - one training step. The label is free: it is the next token
 * of the same sentence, which is the whole trick behind pre-training.
 */
export function trainingStep(text: string) {
  const ids = encode(text).ids;
  const positions: TrainingPosition[] = [];
  let totalLoss = 0;

  for (let i = 0; i < ids.length - 1; i++) {
    const probabilities = softmax(forward(ids.slice(0, i + 1))); // a real model does all positions at once
    const label = ids[i + 1]; // the label, free of charge
    const probability = probabilities[label];
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
    mode: "training",
    weightsUpdated: true,
    positions,
    averageLoss: Number((totalLoss / Math.max(positions.length, 1)).toFixed(4)),
    update: "Observed pairs added to the bigram counts. A real LLM runs backward() and moves every weight (§08.9).",
    note: "Send the same text twice: the loss falls the second time, because the weights moved. Prompting never does that.",
  };
}
