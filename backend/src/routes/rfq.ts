import { Router } from 'express';
import { createRFQ, generateSecureLink } from '../controllers/rfqController';

const router = Router();

// RFQ routes
router.post('/', createRFQ);
router.post('/:id/secure-link', generateSecureLink);

export default router;
