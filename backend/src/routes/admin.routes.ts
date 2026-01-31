import { Router } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import { adminSubmissionTokenLimiter } from '../middleware/rateLimiters.js';
import {
  createSubmissionToken,
  deleteSubmissionToken,
  listSubmissionTokens,
  revokeSubmissionToken,
  updateSubmissionToken,
} from '../controllers/submissionToken.controller.js';
import {
  deleteAdminRfq,
  disableAdminToken,
  deleteAdminQuotation,
  approveAdminQuotation,
  getAdminQuotationById,
  getAdminRfqById,
  getAdminSettings,
  getAdminStats,
  listAdminQuotationIndex,
  listAdminLogs,
  listAdminRfqs,
  listAdminTokens,
  listAdminQuotations,
  markCustomerAcceptedAdminQuotation,
  regenerateAdminQuotationPdf,
  rejectAdminQuotation,
  regenerateAdminToken,
  updateAdminQuotationStatus,
  updateAdminQuotation,
  updateAdminQuotationById,
  updateAdminSettings,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(apiKeyAuth);

router.get('/stats', getAdminStats);
router.get('/rfqs', listAdminRfqs);
router.get('/rfqs/:id', getAdminRfqById);
router.get('/rfqs/:id/quotations', listAdminQuotations);
router.get('/quotations', listAdminQuotationIndex);
router.get('/quotations/:id', getAdminQuotationById);
router.patch('/quotations/:id', updateAdminQuotation);
router.patch('/quotations/:id/approve', approveAdminQuotation);
router.patch('/quotations/:id/reject', rejectAdminQuotation);
router.patch('/quotations/:id/customer-accepted', markCustomerAcceptedAdminQuotation);
router.patch('/quotations/:id/status', updateAdminQuotationStatus);
router.post('/quotations/:id/regenerate-pdf', regenerateAdminQuotationPdf);
router.delete('/quotations/:id', deleteAdminQuotation);
router.delete('/rfqs/:id', deleteAdminRfq);
router.get('/tokens', listAdminTokens);
router.post('/tokens/:id/disable', disableAdminToken);
router.post('/tokens/:id/regenerate', regenerateAdminToken);
router.get('/logs', listAdminLogs);
router.get('/settings', getAdminSettings);
router.post('/settings', updateAdminSettings);

router.post('/submission-tokens', adminSubmissionTokenLimiter, createSubmissionToken);
router.get('/submission-tokens', adminSubmissionTokenLimiter, listSubmissionTokens);
router.patch('/submission-tokens/:id', adminSubmissionTokenLimiter, updateSubmissionToken);
router.post('/submission-tokens/:id/revoke', adminSubmissionTokenLimiter, revokeSubmissionToken);
router.delete('/submission-tokens/:id', adminSubmissionTokenLimiter, deleteSubmissionToken);

export default router;
