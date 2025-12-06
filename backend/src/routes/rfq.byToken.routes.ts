import { Router } from 'express';
import { resolveSecureLinkByToken } from '../controllers/secureLink.controller.js';

const rfqByTokenRouter = Router();

rfqByTokenRouter.get('/:token', resolveSecureLinkByToken);

export { rfqByTokenRouter };
