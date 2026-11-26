import dotenv from 'dotenv';
import express from 'express';
import { config } from './config/config';
import router from './routes/index';

// Load environment variables
dotenv.config();

// ============================================================================
// src/app.ts — Express application entry point
// ============================================================================

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vectorless-rag-basic', env: config.nodeEnv });
});

// Mount all API routes
app.use('/api', router);

// Start the server
app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port} (${config.nodeEnv})`);
});

export default app;