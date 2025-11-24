import { Router } from 'express';
import { validate, RFQSchema } from '@rfq-system/shared';
import { createRFQ, generateSecureLink, getRFQByToken } from '../controllers/rfq.controller';

const router = Router();

router.post('/', validate(RFQSchema), createRFQ);
router.get('/by-token/:token', getRFQByToken);
router.post('/:id/secure-link', generateSecureLink);

export default router;