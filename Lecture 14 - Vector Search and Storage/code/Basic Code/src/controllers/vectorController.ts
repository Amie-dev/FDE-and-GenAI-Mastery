/**
 * Lecture 14 — Basic controllers.
 * HTTP handlers for storing vectors and searching them.
 */

import type { Request, Response } from 'express';
import type { VectorRecord, SearchResult } from '../types';
import { addVector, searchVectors, vectorCount } from '../services/vectorService';

/** POST /vectors — store a vector record. */
export function storeVector(req: Request, res: Response): void {
  const { id, embedding, metadata } = req.body as VectorRecord;

  if (!id || !Array.isArray(embedding) || embedding.length === 0) {
    res.status(400).json({ error: 'id and embedding (non-empty number[]) are required' });
    return;
  }

  addVector({ id, embedding, metadata });
  res.status(201).json({ message: 'vector stored', id });
}

/** GET /search?vector=0.1,0.2&k=5 — brute-force top-K search. */
export function search(req: Request, res: Response): void {
  const vectorParam = req.query.vector;

  if (typeof vectorParam !== 'string') {
    res.status(400).json({ error: 'query param "vector" (comma-separated numbers) is required' });
    return;
  }

  const query = vectorParam.split(',').map(Number);
  const k = req.query.k ? Number(req.query.k) : 5;

  if (query.some((v) => Number.isNaN(v))) {
    res.status(400).json({ error: 'vector must contain only numbers' });
    return;
  }

  const results: SearchResult[] = searchVectors(query, k);
  res.json({
    count: results.length,
    totalStored: vectorCount(),
    results,
  });
}