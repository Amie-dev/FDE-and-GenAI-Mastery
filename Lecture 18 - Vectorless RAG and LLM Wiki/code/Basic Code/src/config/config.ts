import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Central configuration. Every module imports this same config object
// instead of reading process.env directly throughout the app.
export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  maxTreeDepth: Number(process.env.MAX_TREE_DEPTH) || 3,
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
};