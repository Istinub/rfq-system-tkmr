import { Router } from 'express';
import { SecureLinkSchema, validate } from '@rfq-system/shared';
import * as secureLinkController from '../controllers/secureLink.controller';

const router = Router();

const secureLinkParamsSchema = SecureLinkSchema.pick({ token: true });

router.get('/:token', validate(secureLinkParamsSchema, 'params'), secureLinkController.getByToken);

export default router;
