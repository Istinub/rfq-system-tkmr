import { Router } from 'express';
import { validate } from '@rfq-system-tkmr/shared/src/utils/validate';
import { RFQSchema } from '@rfq-system-tkmr/shared/src/schemas/rfq.schema';
import { createRFQ, generateSecureLink } from '../controllers/rfq.controller';

const router = Router();

router.post('/', validate(RFQSchema), createRFQ);
router.post('/:id/secure-link', generateSecureLink);

export default router;