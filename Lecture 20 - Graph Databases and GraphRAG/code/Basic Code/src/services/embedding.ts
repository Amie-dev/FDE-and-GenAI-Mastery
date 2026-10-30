/** Deterministic embedding (Chapter 06).
 * In production this would call OpenAI / Cohere / a local model.
 * The deterministic version lets the basic code run without an API key.
 */
function embed(text: string): number[] {
  const vector = new Array(1536).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < 1536; i++) {
    vector[i] = ((hash >> (i % 4)) & 0xf) / 15;
  }
  return vector;
}

export { embed };