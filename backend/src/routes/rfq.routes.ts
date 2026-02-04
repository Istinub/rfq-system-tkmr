import { Router, type RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import multer, { MulterError } from 'multer';
import { Prisma } from '@prisma/client';
import { submissionOrAdminAuth } from '../middleware/submissionOrAdminAuth.js';
import { createRFQ, createRFQMultipart, deleteRFQ, getRFQ, listRFQs } from '../controllers/rfq.controller.js';

const storage = multer.memoryStorage();
const allowedMimeTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.originalname} (${file.mimetype})`));
    }
  },
});

const handleMulter: RequestHandler = (req, res, next) => {
  upload.array('files')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large (max 15MB)' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files (max 10)' });
      }
      return res.status(400).json({ error: err.message });
    }
    return res.status(400).json({ error: (err as Error)?.message || 'File upload error' });
  });
};

const router = Router();

router
  .route('/')
  .post(submissionOrAdminAuth, createRFQ)
  .get(listRFQs);

router.post('/multipart', submissionOrAdminAuth, handleMulter, async (req, res) => {
  try {
    await createRFQMultipart(req, res, () => undefined);
  } catch (err) {
    const errorId = randomUUID();
    const itemsValue = (req.body as Record<string, unknown> | undefined)?.items as unknown;
    const itemsType = typeof itemsValue;
    const itemsPreview = typeof itemsValue === 'string' ? itemsValue.slice(0, 200) : undefined;
    const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];

    const baseLog = {
      errorId,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      itemsType,
      itemsPreview,
      fileCount: files.length,
      files: files.map((f) => ({ originalname: f.originalname, mimetype: f.mimetype, size: f.size })),
    };

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[RFQ multipart error][Prisma]', {
        ...baseLog,
        prismaCode: err.code,
        prismaMeta: err.meta,
      });
    } else {
      console.error('[RFQ multipart error]', baseLog);
    }

    res.status(500).json({ errorId, message: 'Internal server error' });
  }
});

router
  .route('/:id')
  .get(getRFQ)
  .delete(deleteRFQ);

export default router;
