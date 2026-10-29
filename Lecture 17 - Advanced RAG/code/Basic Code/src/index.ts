import { app } from "./app";
import { config } from "./config/config";

app.listen(config.port, () => {
  console.log(`Advanced RAG server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`POST http://localhost:${config.port}/rag/query`);
});