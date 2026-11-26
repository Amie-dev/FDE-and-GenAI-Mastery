import { app } from "./app";
import { config } from "./config/config";

app.listen(config.PORT, () => {
  console.log(`Advanced RAG server running on http://localhost:${config.PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`POST http://localhost:${config.PORT}/api/rag/query`);
});