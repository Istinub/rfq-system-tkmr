import { z } from 'zod';

const isoDateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Value must be a valid ISO date string',
});

const hexToken = z
  .string()
  .length(64, 'Token must be 64 characters')
  .regex(/^[0-9a-f]+$/i, 'Token must be hexadecimal');

const accessLogSchema = z.object({
  time: isoDateString,
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

export const SecureLinkSchema = z.object({
  token: hexToken,
  rfqId: z.union([z.string().min(1, 'RFQ ID is required'), z.number().int().nonnegative()]),
  createdAt: isoDateString,
  expires: isoDateString,
  oneTime: z.boolean().default(false),
  firstAccessAt: isoDateString.nullable().default(null),
  accessCount: z.number().int().nonnegative().default(0),
  accessLogs: z.array(accessLogSchema).default([]),
});

export type SecureLink = z.infer<typeof SecureLinkSchema>;