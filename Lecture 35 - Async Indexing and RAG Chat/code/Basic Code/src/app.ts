import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes";
import { config } from "./config/config";

dotenv.config();

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", router);

  app.get("/health", (_req, res) => res.json({ ok: true, service: "lecture-28-basic-code" }));

  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status ?? 500).json({ error: err.message ?? "Internal error" });
  });

  return { app, port: config.port };
}