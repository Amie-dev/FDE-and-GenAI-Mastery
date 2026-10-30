import express from "express";
import { config } from "./config/config";
import router from "./router";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use("/api", router);

app.listen(config.port, () => {
  console.log(`Agent memory basic code listening on http://localhost:${config.port}`);
  console.log(`STM window: ${config.stmWindowSize} turns`);
  console.log(`LTM top-K: ${config.ltmTopK} memories`);
  console.log(`Max context tokens: ${config.maxContextTokens}`);
});

export default app;
