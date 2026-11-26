import express from "express";
import { ragRouter } from "./routes";
import { config } from "./config/config";

const app = express();

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "lecture-17-advanced-rag-basic" });
});

// Chapter 06+ routes: RAG pipeline
app.use("/rag", ragRouter);

export { app };