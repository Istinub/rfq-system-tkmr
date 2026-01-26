import type { RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { hashSubmissionToken } from '../utils/generateToken.js';

const serializeToken = (token: {
  id: string;
  label: string | null;
  expiresAt: Date | null;
  maxUses: number | null;
  uses: number;
  revokedAt: Date | null;
  createdAt: Date;
}) => ({
  id: token.id,
  label: token.label ?? null,
  expiresAt: token.expiresAt ? token.expiresAt.toISOString() : null,
  maxUses: token.maxUses ?? null,
  uses: token.uses,
  revokedAt: token.revokedAt ? token.revokedAt.toISOString() : null,
  createdAt: token.createdAt.toISOString(),
});

const parseExpiresAt = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const parseMaxUses = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? Math.floor(num) : null;
};

export const createSubmissionToken: RequestHandler = async (req, res) => {
  const { label, expiresAt, maxUses } = req.body as {
    label?: unknown;
    expiresAt?: unknown;
    maxUses?: unknown;
  };

  const expiresAtDate = parseExpiresAt(expiresAt);
  if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '' && !expiresAtDate) {
    return res.status(400).json({ error: 'expiresAt must be a valid ISO date string or null' });
  }

  const maxUsesValue = parseMaxUses(maxUses);
  if (maxUses !== undefined && maxUses !== null && maxUses !== '' && (maxUsesValue === null || maxUsesValue < 1)) {
    return res.status(400).json({ error: 'maxUses must be an integer >= 1 or null for unlimited' });
  }

  const cleanedLabel = typeof label === 'string' ? label.trim() : undefined;
  const plainToken = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  const tokenHash = hashSubmissionToken(plainToken);

  try {
    const created = await prisma.submissionToken.create({
      data: {
        label: cleanedLabel === undefined || cleanedLabel === '' ? null : cleanedLabel,
        tokenHash,
        expiresAt: expiresAtDate,
        maxUses: maxUsesValue,
        uses: 0,
      },
    });

    return res.status(201).json({ ...serializeToken(created), token: plainToken });
  } catch (error) {
    console.error('[submissionToken:create]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const listSubmissionTokens: RequestHandler = async (_req, res) => {
  try {
    const tokens = await prisma.submissionToken.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json(tokens.map(serializeToken));
  } catch (error) {
    console.error('[submissionToken:list]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSubmissionToken: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { label, expiresAt, maxUses } = req.body as {
    label?: unknown;
    expiresAt?: unknown;
    maxUses?: unknown;
  };

  const data: { label?: string | null; expiresAt?: Date | null; maxUses?: number | null } = {};

  if (label !== undefined) {
    if (label === null) {
      data.label = null;
    } else if (typeof label === 'string') {
      const trimmed = label.trim();
      data.label = trimmed === '' ? null : trimmed;
    } else {
      return res.status(400).json({ error: 'label must be a string if provided' });
    }
  }

  if (expiresAt !== undefined) {
    const expiresAtDate = parseExpiresAt(expiresAt);
    if (expiresAt !== null && expiresAt !== '' && !expiresAtDate) {
      return res.status(400).json({ error: 'expiresAt must be a valid ISO date string or null' });
    }
    data.expiresAt = expiresAtDate;
  }

  if (maxUses !== undefined) {
    const maxUsesValue = parseMaxUses(maxUses);
    if (maxUses !== null && maxUses !== '' && (maxUsesValue === null || maxUsesValue < 1)) {
      return res.status(400).json({ error: 'maxUses must be an integer >= 1 or null for unlimited' });
    }
    data.maxUses = maxUsesValue;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }

  try {
    const updated = await prisma.submissionToken.update({
      where: { id },
      data,
    });

    return res.json(serializeToken(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Submission token not found' });
    }

    console.error('[submissionToken:update]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const revokeSubmissionToken: RequestHandler = async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await prisma.submissionToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return res.json(serializeToken(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Submission token not found' });
    }

    console.error('[submissionToken:revoke]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSubmissionToken: RequestHandler = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.submissionToken.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Submission token not found' });
    }

    console.error('[submissionToken:delete]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
