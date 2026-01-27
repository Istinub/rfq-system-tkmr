import { Router } from 'express';
import multer from 'multer';
import {
  generateSecureLink,
  invalidateSecureLink,
  resolveSecureLinkByToken,
} from '../controllers/secureLink.controller.js';
import { submitQuotationFromSecureLink } from '../controllers/quotation.controller.js';

const router = Router();

const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

router.post('/:token/quotations', uploadLogo.single('logo'), submitQuotationFromSecureLink);
router.get('/:token', resolveSecureLinkByToken);
router.post('/:rfqId', generateSecureLink);
router.post('/invalidate/:token', invalidateSecureLink);

export default router;
