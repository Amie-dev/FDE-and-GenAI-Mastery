import type { MaskKind, Matrix, ModelShape, Vector } from "../types";
import { add, matmul, randomMatrix, round, roundVector, tokenVectors } from "./attentionService";
import { multiHeadAttention } from "./headService";

/**
 * Chapter 05 - the transformer block, and the misconception it corrects:
 * a Transformer is NOT attention (§05.1). Attention is one sub-layer of six
 * operations, and the FFN - not attention - is where most of the parameters and
 * all of the non-linear feature computation live.
 *
 * The order implemented here is the lecture's own: LayerNorm -> attention ->
 * residual -> LayerNorm -> FFN -> residual. That is pre-LN, and it is what
 * essentially every modern decoder uses (§05.2).
 */

/** Normalise one token's vector to zero mean and unit variance (§05.2 step 1). */
export function layerNorm(x: Vector, gamma?: Vector, beta?: Vector, eps = 1e-5): Vector {
  const mean = x.reduce((sum, value) => sum + value, 0) / x.length;
  const variance = x.reduce((sum, value) => sum + (value - mean) ** 2, 0) / x.length;
  const standardDeviation = Math.sqrt(variance + eps);
  return x.map((value, i) => round(((value - mean) / standardDeviation) * (gamma?.[i] ?? 1) + (beta?.[i] ?? 0)));
}

/** RMSNorm: skips the mean subtraction and the bias. Cheaper, and just as good (§05.2). */
export function rmsNorm(x: Vector, eps = 1e-6): Vector {
  const meanSquare = x.reduce((sum, value) => sum + value * value, 0) / x.length;
  const rootMeanSquare = Math.sqrt(meanSquare + eps);
  return x.map((value) => round(value / rootMeanSquare));
}

/** GELU - the non-linearity used by GPT-2 and GPT-3 (§05.2 step 5). */
export function gelu(value: number): number {
  return round(0.5 * value * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (value + 0.044715 * value ** 3))), 6);
}

/**
 * FFN(x) = GELU(x W_1 + b_1) W_2 + b_2 - expand, non-linearity, contract.
 * Strictly per token: the FFN never mixes positions, because attention already
 * did that. This is the only place new features are computed (§05.2 step 5).
 */
export function ffn(x: Vector, spec: ModelShape, seed: number) {
  const W1 = randomMatrix(spec.dModel, spec.dFF, seed + 11);
  const W2 = randomMatrix(spec.dFF, spec.dModel, seed + 12);
  const expanded = matmul([x], W1)[0];
  const activated = expanded.map(gelu);
  const output = matmul([activated], W2)[0];
  return { W1, W2, expanded: roundVector(expanded), activated: roundVector(activated), output: roundVector(output) };
}

/**
 * One complete transformer block. Every stage is returned, because the whole
 * point of the chapter is that H_out has the SAME shape as H_in - the block
 * adds a correction to the residual stream instead of replacing it.
 */
export function transformerBlock(H: Matrix, spec: ModelShape, seed: number, mask: MaskKind = "causal") {
  const H_in = H;

  const ln1 = H_in.map((row) => layerNorm(row)); // 1
  const attention = multiHeadAttention(ln1, spec, seed, mask); // 2
  const H_mid = H_in.map((row, i) => add(row, attention.mixed[i])); // 3 residual

  const ln2 = H_mid.map((row) => layerNorm(row)); // 4
  const ffnPerToken = ln2.map((row, i) => ffn(row, spec, seed + i).output); // 5
  const H_out = H_mid.map((row, i) => add(row, ffnPerToken[i])); // 6 residual

  // The residual-stream check: H_out really is H_in plus the two deltas.
  const rebuilt = H_in.map((row, i) => add(add(row, attention.mixed[i]), ffnPerToken[i]));

  return {
    H_in,
    ln1,
    attentionOutput: attention.mixed,
    H_mid,
    ln2,
    ffnOutput: ffnPerToken,
    H_out,
    checks: {
      sameShape: H_out.length === H_in.length && H_out[0].length === H_in[0].length,
      residualStreamHolds: String(rebuilt) === String(H_out),
      changed: String(H_out) !== String(H_in),
    },
    note:
      "H_out = H_in + attention(H_in) + FFN(...). Nothing is overwritten: the block writes a delta onto " +
      "the residual stream, which is why sub-layers can be removed or edited with graceful degradation.",
  };
}

/**
 * §05.4 - where the parameters actually live, per layer:
 *   attention: W_Q + W_K + W_V + W_O = 4 d_model^2
 *   FFN:       W_1 + W_2             = 2 d_model x d_ff
 * With the usual d_ff = 4 d_model the FFN is exactly two-thirds of the block.
 */
export function parameterBudget(spec: ModelShape) {
  const { dModel, dFF, layers } = spec;
  const attentionPerLayer = 4 * dModel * dModel;
  const ffnPerLayer = 2 * dModel * dFF;
  const perLayer = attentionPerLayer + ffnPerLayer;
  return {
    spec: spec.id,
    dModel,
    dFF,
    layers,
    perLayer: { attention: attentionPerLayer, ffn: ffnPerLayer, total: perLayer },
    total: perLayer * layers,
    ffnShare: round(ffnPerLayer / perLayer, 4),
    attentionShare: round(attentionPerLayer / perLayer, 4),
    verdict: "about two-thirds of the parameters sit in the FFN, not in attention (§05.4)",
  };
}

/**
 * §05.3 - why many layers. One block does one round of mixing plus one FFN pass;
 * understanding needs a hierarchy of abstractions, built layer by layer.
 */
export function abstractionLayers() {
  return [
    { stage: "Early layers (1-4)", learns: "'server' and 'memory' are co-occurring technical terms" },
    { stage: "Middle layers (5-15)", learns: "'server ran out of memory' is a resource-failure event" },
    { stage: "Deep layers (16-32)", learns: "the sentence describes a deployment failure CAUSED BY resource exhaustion" },
  ];
}

/** A whole stack of blocks: the residual stream carried from input to output. */
export function runStack(tokens: string[], spec: ModelShape, seed: number, mask: MaskKind = "causal") {
  const H0 = tokenVectors(tokens, spec.dModel);
  const stages = Array.from({ length: spec.layers }, (_, layer) => transformerBlock(H0, spec, seed + layer * 17, mask));
  const last = stages[stages.length - 1];
  return {
    layers: spec.layers,
    residualStream: { input: H0, output: last.H_out },
    shapeStable: last.H_out[0].length === H0[0].length,
    perLayerChecks: stages.map((stage, layer) => ({ layer, ...stage.checks })),
    note: "Every layer reads the stream, computes a delta and adds it back. The width never changes (§05.2).",
  };
}

