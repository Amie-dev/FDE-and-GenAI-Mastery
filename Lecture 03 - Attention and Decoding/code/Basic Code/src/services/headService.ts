import type { MaskKind, Matrix, ModelShape } from "../types";
import { attention, kvCacheBytes, matmul, project, randomMatrix, round, type AttentionResult } from "./attentionService";

/**
 * Chapter 04 - multi-head attention. One attention pattern is not enough
 * (§04.1), so the model runs h of them in parallel, each on its own slice of the
 * token vector, then concatenates the results and mixes them with W_O (§04.2).
 *
 * The arithmetic that makes this cheap: d_head = d_model / h, so
 * h x d_head = d_model. Splitting into heads does NOT make the output wider -
 * it redistributes the same width across h independent relationship patterns.
 */

/** One head: its own Q, K, V, its own weight matrix, its own output. */
export type Head = {
  head: number;
  dHead: number;
  Q: Matrix;
  K: Matrix;
  V: Matrix;
  weights: AttentionResult["weights"];
  output: Matrix;
};

/** Cut a d_model-wide sequence into h d_head-wide slices (§04.3). */
export function headSlices(X: Matrix, nHeads: number): Matrix[] {
  const dHead = X[0].length / nHeads;
  return Array.from({ length: nHeads }, (_, head) => X.map((row) => row.slice(head * dHead, (head + 1) * dHead)));
}

/**
 * The §04.2 formula: for each head run attention, concatenate the h outputs back
 * to d_model, then apply the learned output projection W_O. W_O is the only part
 * of multi-head attention that lets the heads exchange information.
 */
export function multiHeadAttention(X: Matrix, spec: ModelShape, seed: number, mask: MaskKind = "causal") {
  const dHead = spec.dModel / spec.nHeads;
  const heads: Head[] = headSlices(X, spec.nHeads).map((slice, head) => {
    const { Q, K, V } = project(slice, dHead, seed + head * 100);
    const result = attention(Q, K, V, dHead, mask);
    return { head, dHead, Q, K, V, weights: result.weights, output: result.output };
  });

  const concatenated = heads[0].output.map((_, position) => heads.flatMap((head) => head.output[position]));
  const W_O = randomMatrix(spec.dModel, spec.dModel, seed + 999);
  const mixed = matmul(concatenated, W_O);

  return {
    dModel: spec.dModel,
    nHeads: spec.nHeads,
    dHead,
    widthPreserved: spec.nHeads * dHead === spec.dModel,
    heads,
    concatenated,
    W_O,
    mixed,
    note:
      "Each head saw the same tokens but a different slice of each vector, so each learned its own " +
      "relationship pattern. W_O then mixes the h views back into one d_model vector per token.",
  };
}

/**
 * The §04.3 cost table, computed rather than quoted. Multi-head attention is
 * nearly free: the projections cost the same and the mixing FLOPs are identical.
 * Only the h separate score matrices (memory) and W_O are genuinely new.
 */
export function costComparison(n: number, spec: ModelShape) {
  const { dModel, nHeads: h } = spec;
  const dHead = dModel / h;
  return {
    n,
    dModel,
    nHeads: h,
    dHead,
    totalWidthPreserved: h * dHead === dModel,
    projectionParameters: {
      singleFullWidthHead: 3 * dModel * dModel,
      multiHead: 3 * dModel * dModel,
      identical: true,
    },
    scoreMatrixEntries: { singleFullWidthHead: n * n, multiHead: h * n * n },
    mixingFlops: {
      singleFullWidthHead: n * n * dModel,
      multiHead: h * n * n * dHead,
      identical: n * n * dModel === h * n * n * dHead,
    },
    outputProjectionParameters: dModel * dModel,
    whatDiffers: "one relationship pattern vs h independent relationship patterns",
    verdict: "h different views for roughly the price of one; the extra cost is memory, not compute",
  };
}

/**
 * §04.5 - the KV-cache reason MQA and GQA exist. Q is used once per token, but K
 * and V of every previous token are needed again, so the cache is sized by how
 * many KV heads the model keeps. MQA keeps one; GQA keeps a few.
 */
export function kvCacheVariants(n: number, spec: ModelShape, bytesPerValue = 2) {
  const dHead = spec.dModel / spec.nHeads;
  const variants: { variant: string; kvHeads: number; note: string }[] = [
    { variant: "MHA", kvHeads: spec.nHeads, note: "one K/V pair per head - best quality, largest cache" },
    { variant: "GQA", kvHeads: Math.max(1, Math.round(spec.nHeads / 4)), note: "a few heads share each K/V pair - the modern default" },
    { variant: "MQA", kvHeads: 1, note: "all heads share one K/V pair - smallest cache, some quality loss" },
  ];

  const mhaBytes = 2 * n * spec.layers * spec.nHeads * dHead * bytesPerValue;
  return variants.map(({ variant, kvHeads, note }) => {
    const bytes = 2 * n * spec.layers * kvHeads * dHead * bytesPerValue;
    return {
      variant,
      kvHeads,
      bytes,
      mb: round(bytes / 1024 / 1024, 3),
      savingVsMHA: round(1 - bytes / mhaBytes, 3),
      note,
    };
  });
}

/** §04.4 - what heads are observed to specialise in, from the lecture's list. */
export function headRoles() {
  return [
    { role: "Previous-token head", focus: "the token immediately before this one", why: "local order and syntax" },
    { role: "Syntactic head", focus: "subject-verb and modifier-noun pairs", why: "grammatical agreement" },
    { role: "Coreference head", focus: "pronouns and the nouns they point at", why: "'it' resolves to the right entity" },
    { role: "Positional head", focus: "fixed offsets, e.g. always two back", why: "structural patterns" },
  ];
}

/** §04.6 - head count is a hyperparameter: d_head stays 64-128 across model sizes. */
export function headCountGuide() {
  return [
    { model: "GPT-2 small", dModel: 768, nHeads: 12, dHead: 64 },
    { model: "LLaMA-3 8B", dModel: 4096, nHeads: 32, dHead: 128 },
    { model: "LLaMA-3 70B", dModel: 8192, nHeads: 64, dHead: 128 },
    { model: "GPT-3", dModel: 12288, nHeads: 96, dHead: 128 },
  ];
}

/** Reference, so the controller can report the cache a plain single-head model would need. */
export const singleHeadKvBytes = kvCacheBytes;
