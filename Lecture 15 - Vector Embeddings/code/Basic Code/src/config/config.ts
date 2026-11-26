// config/config.ts — Load environment + build typed config
import dotenv from "dotenv";
import { AppConfig } from "../types/index.js";

// Load .env file into process.env
dotenv.config();

const _config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  defaultVectorDim: Number(process.env.DEFAULT_VECTOR_DIM) || 8,
  maxSentences: Number(process.env.MAX_SENTENCES) || 30,
};

console.log(`[config] env=${_config.nodeEnv}  port=${_config.port}  dim=${_config.defaultVectorDim}`);

export default _config;
