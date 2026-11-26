import express from "express";
import { config } from "./config/config";
import router from "./router";

/** Build and start the Express app. */
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use("/api", router);

app.listen(config.port, () => {
  console.log(`RAG basic code listening on http://localhost:${config.port}`);
  console.log(`Embedding model: ${config.embeddingModel} (${config.embeddingDims} dims)`);
  console.log(`Namespace: ${config.namespace}`);
});

export default app;