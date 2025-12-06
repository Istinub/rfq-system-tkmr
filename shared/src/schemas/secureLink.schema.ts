import { z } from 'zod';

const isoDateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Value must be a valid ISO date string',
});

const hexToken = z
  .string()
  .length(64, 'Token must be 64 characters')
  .regex(/^[0-9a-f]+$/i, 'Token must be hexadecimal');

export const SecureLinkSchema = z.object({
  token: hexToken,
  rfqId: z.union([z.string().min(1, 'RFQ ID is required'), z.number().int().nonnegative()]),
  createdAt: isoDateString,
  expiresAt: isoDateString,
  oneTime: z.boolean().default(false),
  firstAccessAt: isoDateString.nullable().default(null),
  lastAccessIP: z.string().min(1).nullable().default(null),
  accessCount: z.number().int().nonnegative().default(0),
});

export type SecureLink = z.infer<typeof SecureLinkSchema>;