import express from 'express';
import { config } from './config/config';
import { inputGuardrail, outputGuardrail } from './middleware/guardrail.middleware';
import { router } from './routes/index';

const app = express();

app.use(express.json());

// Layer 1 — input guardrail: mask PII before it enters the app
app.use(inputGuardrail);

// Routes
app.use('/chat', router);

// Layer 4 — output guardrail: redact PII before it leaves the app
app.use(outputGuardrail);

app.listen(config.port, () => {
  console.log(`Lecture 31 basic server running on http://localhost:${config.port}`);
});