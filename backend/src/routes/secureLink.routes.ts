import { Router } from 'express';
import {
  generateSecureLink,
  invalidateSecureLink,
  resolveSecureLinkByToken,
} from '../controllers/secureLink.controller.js';

const router = Router();

router.get('/:token', resolveSecureLinkByToken);
router.post('/:rfqId', generateSecureLink);
router.post('/invalidate/:token', invalidateSecureLink);

export default router;
