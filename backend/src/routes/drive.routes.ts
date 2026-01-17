import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import fs from 'fs';
import path from 'path';

import { getDrive, getDriveRootFolderId } from '../lib/googleDrive.js';

const router = Router();

/**
 * Small, simple protection for production:
 * - Require x-admin-api-key header to upload
 */
const requireAdminKey = (req: any, res: any, next: any) => {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return next(); // allow if not configured (dev)
  const provided = req.header('x-admin-api-key');
  if (provided !== expected) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  return next();
};

/**
 * Use disk storage (safer than memory for larger files).
 * Render/Codespaces have ephemeral disk, which is fine for temp files.
 */
const upload = multer({
  dest: path.join(os.tmpdir(), 'rfq-drive-uploads'),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB (adjust if needed)
  },
});

router.get('/ping', async (_req, res) => {
  const drive = getDrive();
  const folderId = getDriveRootFolderId();

  let user: any = null;
  try {
    const about = await drive.about.get({ fields: 'user(emailAddress)' });
    user = about.data.user ?? null;
  } catch {
    // ignore, still allow folder check below
  }

  try {
    const folder = await drive.files.get({
      fileId: folderId,
      supportsAllDrives: true,
      fields: 'id,name,mimeType,driveId',
    });

    return res.json({
      ok: true,
      user,
      rootFolder: folder.data,
    });
  } catch (err: any) {
    return res.status(200).json({
      ok: false,
      user,
      folderId,
      folderError: { message: err?.message ?? 'Folder lookup failed', code: err?.code ?? 500 },
    });
  }
});

/**
 * POST /api/drive/upload
 * form-data:
 *  - file: <binary>
 *  - name (optional): custom filename
 */
router.post('/upload', requireAdminKey, upload.single('file'), async (req, res) => {
  const drive = getDrive();
  const folderId = getDriveRootFolderId();

  if (!req.file) {
    return res.status(400).json({ ok: false, message: 'Missing form-data file field: "file"' });
  }

  const tmpPath = req.file.path;
  const originalName = req.body?.name?.toString().trim() || req.file.originalname || 'upload.bin';
  const mimeType = req.file.mimetype || 'application/octet-stream';

  try {
    const created = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: originalName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: fs.createReadStream(tmpPath),
      },
      fields: 'id,name,mimeType,size,webViewLink,webContentLink,createdTime',
    });

    return res.status(201).json({
      ok: true,
      file: created.data,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: err?.message ?? 'Upload failed',
      code: err?.code ?? 500,
    });
  } finally {
    // cleanup temp file
    fs.promises.unlink(tmpPath).catch(() => {});
  }
});

export default router;