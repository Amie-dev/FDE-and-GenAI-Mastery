import type { Architecture, AttentionMode, ModelShape } from "../types";
import { kvCacheBytes, maskMatrix, round } from "./attentionService";

/**
 * Chapter 06 - encoder-decoder vs decoder-only, and why GPT is decoder-only.
 *
 * The three families differ in exactly one place: WHICH POSITIONS a token is
 * allowed to read. That is the mask. Everything else - blocks, heads, FFN,
 * logits - is the same machinery you have already built.
 */

/** §06.1 - the three families, what each is built for, and who uses it. */
export function families(): { family: Architecture; builtFor: string; mask: string; examples: string[] }[] {
  return [
    {
      family: "encoder-decoder",
      builtFor: "transforming one sequence into another (translation, summarisation, speech)",
      mask: "bidirectional in the encoder, causal in the decoder, plus cross-attention between them",
      examples: ["the original 2017 Transformer", "T5", "BART", "Whisper"],
    },
    {
      family: "encoder-only",
      builtFor: "understanding a whole sequence at once (classification, embeddings, retrieval)",
      mask: "bidirectional everywhere - every token sees every other token",
      examples: ["BERT", "RoBERTa", "embedding models"],
    },
    {
      family: "decoder-only",
      builtFor: "generating the next token, and - through prompting - everything else",
      mask: "causal everywhere - a token never sees the future",
      examples: ["GPT-2/3/4", "LLaMA", "Mistral", "Claude", "Gemini"],
    },
  ];
}

/** §06.3 - the three attention modes, as actual masks. 1 = allowed, 0 = blocked. */
export function attentionModes(n: number): { mode: AttentionMode; mask: number[][]; sees: string; usedBy: string }[] {
  return [
    {
      mode: "bidirectional",
      mask: maskMatrix(n, "none"),
      sees: "every position, including the ones after it",
      usedBy: "encoder self-attention",
    },
    {
      mode: "causal",
      mask: maskMatrix(n, "causal"),
      sees: "position j <= i only - never the future",
      usedBy: "decoder self-attention",
    },
    {
      mode: "cross",
      mask: maskMatrix(n, "none"),
      sees: "every ENCODER position; the decoder's own self-attention stays causal",
      usedBy: "the original 2017 encoder-decoder, T5, Whisper",
    },
  ];
}

/**
 * §06.7 - the asymmetry that shapes everything. Training scores every position
 * at once with teacher forcing, so one forward pass covers N predictions. At
 * inference the model must generate token by token, so N tokens cost N forward
 * passes - which is why the KV cache exists (ch02 §02.8).
 */
export function trainingVsInference(n: number, spec: ModelShape, bytesPerValue = 2) {
  return {
    n,
    training: {
      forwardPasses: 1,
      predictionsScored: n,
      why: "teacher forcing: the true next token is fed in for every position, in parallel",
    },
    inference: {
      forwardPasses: n,
      predictionsScored: n,
      why: "each token needs the previous one, so generation is inherently sequential",
      kvCacheBytes: kvCacheBytes(n, spec.layers, spec.dModel, bytesPerValue),
    },
    speedupOfTraining: n,
    note: "This is the whole reason serving is expensive and training is efficient - not the model, the loop (§06.7).",
  };
}

/** §06.4 - the five reasons GPT-style models won. */
export function whyDecoderOnly() {
  return [
    { reason: "One objective", detail: "predict the next token - no task-specific head, no second loss" },
    { reason: "One mask", detail: "causal everywhere; the same block stacks to any depth" },
    { reason: "One cache", detail: "a single KV cache serves every request, and it is trivially incremental" },
    { reason: "Prompting works out of the box", detail: "any task can be phrased as a continuation of text" },
    { reason: "Scales cleanly", detail: "in-context learning and instruction following emerge without architecture changes" },
  ];
}

/** §06.5 - what decoder-only gives up, and where it went instead. */
export function whatWasGivenUp() {
  return [
    { givenUp: "Bidirectional context for understanding", replacement: "encoder-only models, still used for embeddings and retrieval" },
    { givenUp: "A separate cross-attention path", replacement: "the encoder becomes a prefix, attended to by the same self-attention (§06.6)" },
    { givenUp: "Cheap whole-sequence scoring", replacement: "prefix-LM / fill-in-the-middle, used by code models" },
  ];
}

/** §06.6 - prefix-LM: "the encoder is just a prefix". */
export function prefixLm() {
  return {
    idea: "keep the decoder-only stack, but let the prompt be attended bidirectionally and the answer causally",
    mask: "two blocks: 1s for prompt x prompt, causal for the answer, all-ones from answer to prompt",
    usedBy: "code completion (fill-in-the-middle), some instruction-tuned variants",
    tradeOff: "the mask now depends on where the prompt ends, so it is less uniform than pure causal",
  };
}

/** §06.8 - the decision table, as data. */
export function chooseFamily(task: string) {
  const table = [
    { need: "generate text, chat, reason, use tools", family: "decoder-only" as Architecture, why: "one causal mask, one objective, prompting works" },
    { need: "classify, embed, retrieve, rerank", family: "encoder-only" as Architecture, why: "bidirectional context gives a better fixed representation" },
    { need: "translate, transcribe, summarise with a strict source", family: "encoder-decoder" as Architecture, why: "the source is read in full before the output starts" },
  ];
  return { asked: task, table, default: "decoder-only", note: "if in doubt, decoder-only is the safe default (§06.8)" };
}

/** §06.7 - how much of the score matrix a causal mask actually keeps. */
export function contextReach(n: number) {
  const causal = maskMatrix(n, "causal").flat().reduce((sum, value) => sum + value, 0);
  const bidirectional = maskMatrix(n, "none").flat().reduce((sum, value) => sum + value, 0);
  return {
    n,
    causalVisiblePairs: causal,
    bidirectionalVisiblePairs: bidirectional,
    ratio: round(bidirectional / causal, 4),
    note: "A causal mask hides about half of the N x N score matrix - that is the price of being able to generate.",
  };
}

