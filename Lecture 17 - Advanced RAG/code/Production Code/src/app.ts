import express from "express";
import rateLimit from "express-rate-limit";
import { routes } from "./routes";
import { config } from "./config/config";
import logger from "./middleware/logger";

const app = express();

app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, "request");
  next();
});

app.use(express.json());
app.use(
  rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "lecture-17-advanced-rag-production",
    environment: config.NODE_ENV,
    version: "1.0.0",
  });
});

app.use("/api", routes);

export { app };