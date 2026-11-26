import { Router } from 'express';
import { VectorController } from '../controllers/vectorController';
import { VectorService } from '../services/vectorService';

/**
 * Chapter 05 — Route definitions for the vector search API.
 * One route per operation: store, search, count.
 */
const router = Router();
const service = new VectorService();
const controller = new VectorController(service);

router.post('/vectors', controller.addVector);
router.post('/search', controller.searchVectors);
router.get('/vectors/count', controller.getCount);

export default router;