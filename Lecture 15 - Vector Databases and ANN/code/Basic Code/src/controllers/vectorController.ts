import { Request, Response } from 'express';
import { VectorService } from '../services/vectorService';
import { VectorRecord, SearchResult, VectorFilter } from '../types';

/**
 * Chapter 05 — Basic engine operations exposed as HTTP API.
 * Each handler is thin: parse request → call service → send response.
 */
export class VectorController {
  constructor(private readonly service: VectorService) {}

  /**
   * POST /vectors
   * Body: { id, vector: number[], payload: {...} }
   * Stores a vector record (Chapter 01 — write path).
   */
  addVector = (req: Request, res: Response): void => {
    const record: VectorRecord = req.body;
    if (!record.id || !record.vector) {
      res.status(400).json({ error: 'id and vector are required' });
      return;
    }
    this.service.add(record);
    res.status(201).json({ message: 'vector stored', id: record.id });
  };

  /**
   * POST /search
   * Body: { vector: number[], k?: number, filter?: {...} }
   * Returns top-k similar vectors (Chapter 01 — read path).
   */
  searchVectors = (req: Request, res: Response): void => {
    const { vector, k = 5, filter }: { vector: number[]; k?: number; filter?: VectorFilter } =
      req.body;

    if (!vector) {
      res.status(400).json({ error: 'query vector is required' });
      return;
    }

    const results: SearchResult[] = this.service.search(vector, k, filter);
    res.json({ count: results.length, results });
  };

  /**
   * GET /vectors/count
   * Returns how many vectors are stored.
   */
  getCount = (_req: Request, res: Response): void => {
    res.json({ count: this.service.count() });
  };
}