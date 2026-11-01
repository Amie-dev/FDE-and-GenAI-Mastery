// config/config.ts — Load environment + build typed config
import dotenv from "dotenv";

// Load .env file into process.env
dotenv.config();

const _config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
};

console.log(`[config] env=${_config.nodeEnv} port=${_config.port}`);

export default _config;