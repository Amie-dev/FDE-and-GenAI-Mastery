import { createApp } from "./app";
import { config } from "./config/config";
import { VOCAB_SIZE } from "./services/tokenizerService";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Lecture 02 - LLM Foundations (basic code) listening on http://localhost:${config.port}/api`);
  console.log(`vocabulary: ${VOCAB_SIZE} tokens · d_model: ${config.dModel} · default model: ${config.defaultModel}`);
});
