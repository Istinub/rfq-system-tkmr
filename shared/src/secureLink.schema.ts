import { z } from 'zod';

const isoDateValidator = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Expires must be a valid ISO date string' });

export const SecureLinkSchema = z.object({
  token: z.string().length(64, 'Token must be 64 characters'),
  expires: isoDateValidator,
  rfqId: z.string().min(1, 'RFQ ID is required'),
});

export type SecureLinkSchemaType = z.infer<typeof SecureLinkSchema>;