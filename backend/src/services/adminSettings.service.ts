import type { AdminSetting } from '@prisma/client';
import prisma from '../lib/prisma.js';

const DEFAULT_ID = 'default';

export interface AdminSettingsPayload {
  tokenExpiryDays: number;
  oneTimeAccess: boolean;
  rateLimitPerMinute?: number | null;
}

const normalizeSettingsInput = (payload: Partial<AdminSettingsPayload>): AdminSettingsPayload => {
  const tokenExpiryDays = Number(payload.tokenExpiryDays);
  const normalizedExpiry = Number.isFinite(tokenExpiryDays) && tokenExpiryDays > 0 ? Math.floor(tokenExpiryDays) : 7;
  const rateLimitCandidate = payload.rateLimitPerMinute;
  let normalizedRateLimit: number | null = null;

  if (typeof rateLimitCandidate === 'number' || typeof rateLimitCandidate === 'string') {
    const parsed = Number(rateLimitCandidate);
    if (Number.isFinite(parsed) && parsed > 0) {
      normalizedRateLimit = Math.floor(parsed);
    }
  }

  return {
    tokenExpiryDays: normalizedExpiry,
    oneTimeAccess: payload.oneTimeAccess === true,
    rateLimitPerMinute: normalizedRateLimit,
  };
};

const mapRecord = (record: AdminSetting) => ({
  tokenExpiryDays: record.tokenExpiryDays,
  oneTimeAccess: record.oneTimeAccess,
  rateLimitPerMinute: record.rateLimitPerMinute,
});

export const AdminSettingsService = {
  async ensureDefaults(): Promise<AdminSetting> {
    const existing = await prisma.adminSetting.findUnique({ where: { id: DEFAULT_ID } });

    if (existing) {
      return existing;
    }

    return prisma.adminSetting.create({ data: { id: DEFAULT_ID } });
  },

  async getSettings() {
    const record = await this.ensureDefaults();
    return mapRecord(record);
  },

  async updateSettings(payload: Partial<AdminSettingsPayload>) {
    const data = normalizeSettingsInput(payload);

    const record = await prisma.adminSetting.upsert({
      where: { id: DEFAULT_ID },
      update: data,
      create: { id: DEFAULT_ID, ...data },
    });

    return mapRecord(record);
  },

  async getTokenTtlMs(): Promise<number> {
    const record = await this.ensureDefaults();
    const days = Math.max(1, record.tokenExpiryDays);
    return days * 24 * 60 * 60 * 1000;
  },
};
