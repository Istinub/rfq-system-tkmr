import { Router } from 'express';
import { validate, RFQSchema, SecureLinkSchema } from '@rfq-system/shared';
import { createRFQ, generateSecureLink, getRFQByToken } from '../controllers/rfq.controller';

const router = Router();

const secureLinkRequestSchema = SecureLinkSchema.pick({ oneTime: true });

router.post('/', validate(RFQSchema), createRFQ);
router.get('/by-token/:token', getRFQByToken);
router.post('/:id/secure-link', validate(secureLinkRequestSchema), generateSecureLink);

export default router;