/**
 * Lecture 14 — Basic routes.
 * Wires endpoints to controllers.
 */

import { Router } from 'express';
import { storeVector, search } from '../controllers/vectorController';

const router = Router();

/** Store a vector record: ID + embedding + metadata. */
router.post('/vectors', storeVector);

/** Brute-force KNN search: return top K most similar stored vectors. */
router.get('/search', search);

export default router;