import { Router } from 'express';
import { createRFQ, deleteRFQ, getRFQ, listRFQs } from '../controllers/rfq.controller.js';

const router = Router();

router
  .route('/')
  .post(createRFQ)
  .get(listRFQs);

router
  .route('/:id')
  .get(getRFQ)
  .delete(deleteRFQ);

export default router;
