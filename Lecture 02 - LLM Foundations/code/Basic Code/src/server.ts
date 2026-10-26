import { createApp } from "./app";
import { config } from "./config/config";
import { ENCODING_NAMES, vocabularySize } from "./services/tokenizerService";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Lecture 02 - LLM Foundations (basic code) listening on http://localhost:${config.port}/api`);
  console.log(`d_model: ${config.dModel} · default model: ${config.defaultModel} · default encoding: ${config.defaultEncoding}`);
  console.log(`tokenizers: ${ENCODING_NAMES.map((name) => `${name} |V| = ${vocabularySize(name)}`).join(" · ")}`);
});
