import type { NextFunction, Request, Response } from 'express';

import prisma from '../lib/prisma.js';
import { hashSubmissionToken } from '../utils/generateToken.js';

export const submissionOrAdminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const headerToken = req.get('x-submit-token');

  if (!headerToken) {
    return res.status(401).json({ error: 'Missing submission token' });
  }

  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey && headerToken === adminKey) {
    req.submission = { type: 'ADMIN' };
    return next();
  }

  const tokenHash = hashSubmissionToken(headerToken);

  try {
    const submissionToken = await prisma.submissionToken.findUnique({
      where: { tokenHash }
    });

    if (!submissionToken) {
      return res.status(401).json({ error: 'Invalid submission token' });
    }

    const now = new Date();

    if (submissionToken.revokedAt) {
      return res.status(403).json({ error: 'Submission token revoked' });
    }

    if (submissionToken.expiresAt && submissionToken.expiresAt <= now) {
      return res.status(403).json({ error: 'Submission token expired' });
    }

    if (typeof submissionToken.maxUses === 'number' && submissionToken.maxUses >= 0 && submissionToken.uses >= submissionToken.maxUses) {
      return res.status(403).json({ error: 'Submission token uses exhausted' });
    }

    req.submission = { type: 'TOKEN', tokenId: submissionToken.id };
    return next();
  } catch (error) {
    return next(error);
  }
};
