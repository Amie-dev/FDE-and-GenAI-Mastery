/**
 * Lecture 14 — Basic entry point.
 * Creates the Express app, mounts routes, and starts the server.
 */

import express from 'express';
import { config } from './config/config';
import routes from './routes';

const app = express();

app.use(express.json());
app.use('/', routes);

app.listen(config.port, () => {
  console.log(`Vector search server running at http://localhost:${config.port}`);
});