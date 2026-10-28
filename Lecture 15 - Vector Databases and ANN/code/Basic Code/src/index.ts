import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import { config } from './config/config';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.listen(config.port, () => {
  console.log(`Vector search API running on http://localhost:${config.port}`);
});

export default app;