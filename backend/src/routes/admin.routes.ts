import { Router } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import {
  deleteAdminRfq,
  disableAdminToken,
  getAdminRfqById,
  getAdminSettings,
  getAdminStats,
  listAdminLogs,
  listAdminRfqs,
  listAdminTokens,
  regenerateAdminToken,
  updateAdminSettings,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(apiKeyAuth);

router.get('/stats', getAdminStats);
router.get('/rfqs', listAdminRfqs);
router.get('/rfqs/:id', getAdminRfqById);
router.delete('/rfqs/:id', deleteAdminRfq);
router.get('/tokens', listAdminTokens);
router.post('/tokens/:id/disable', disableAdminToken);
router.post('/tokens/:id/regenerate', regenerateAdminToken);
router.get('/logs', listAdminLogs);
router.get('/settings', getAdminSettings);
router.post('/settings', updateAdminSettings);

export default router;
