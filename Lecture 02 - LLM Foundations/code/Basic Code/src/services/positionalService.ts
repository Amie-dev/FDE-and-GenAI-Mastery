import type { Vector } from "../types";
import { dot } from "./embeddingService";

/**
 * Chapter 07 - positional encoding.
 *
 * Self-attention is permutation invariant (§07.1): without a position signal,
 * "Dog bites man" and "Man bites dog" are the same input. Order is injected
 * additively, X_in = E_token + P_pos (§07.2), and this file implements the
 * SINUSOIDAL family from the original transformer (§07.3) - fixed maths, no
 * learned parameters, nothing to run out of.
 */

const round = (value: number): number => Number(value.toFixed(6));

/** The frequency ladder: early dimension pairs oscillate fast, later ones very slowly. */
function frequencies(dModel: number): number[] {
  return Array.from({ length: Math.floor(dModel / 2) }, (_, i) => 1 / Math.pow(10000, (2 * i) / dModel));
}

/** PE(pos, 2i) = sin(pos / 10000^(2i/d_model)), PE(pos, 2i+1) = cos(...) (§07.3). */
export function sinusoidalEncoding(positions: number[], dModel: number): Vector[] {
  const omega = frequencies(dModel);
  return positions.map((pos) => {
    const vector: Vector = new Array(dModel).fill(0);
    for (let i = 0; i < omega.length; i++) {
      vector[2 * i] = round(Math.sin(pos * omega[i])); // even dimensions: sin
      vector[2 * i + 1] = round(Math.cos(pos * omega[i])); // odd dimensions: cos
    }
    return vector;
  });
}

/** X_in = E_token + P_pos. Addition keeps d_model fixed (§07.2). */
export function addPositions(vectors: Vector[], positional: Vector[]): Vector[] {
  return vectors.map((vector, index) => vector.map((value, dimension) => round(value + positional[index][dimension])));
}

/**
 * The linear-offset property (§07.3), measured instead of asserted:
 * P_pos . P_(pos+k) = sum_i cos(omega_i * k), which depends only on k.
 * If every number in the array is the same, the property holds.
 */
export function offsetDotProducts(dModel: number, k: number, positions: number[]): number[] {
  const shifted = positions.map((pos) => pos + k);
  const encoded = sinusoidalEncoding([...positions, ...shifted], dModel);
  return positions.map((pos, index) => round(dot(encoded[index], encoded[positions.length + index])));
}

/** §07.9 guard rail: going past the trained length rarely errors - it quietly gets worse. */
export function trainedLengthWarning(tokenCount: number, maxTrainedPositions: number): string | null {
  if (tokenCount <= maxTrainedPositions) return null;
  return (
    `Exceeding the trained context length (${tokenCount} > ${maxTrainedPositions}). ` +
    "Nothing will throw: quality degrades first, and it shows up as \"the model stopped following instructions\"."
  );
}

/** The complete input pipeline of §07.7, as one line of code. */
export function inputPipeline(ids: number[], vectors: Vector[], dModel: number): Vector[] {
  return addPositions(vectors, sinusoidalEncoding(ids.map((_, index) => index), dModel));
}
