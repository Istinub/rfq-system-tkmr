import type { z } from 'zod';
import { SecureLinkSchema } from '../schemas/secureLink.schema';

export type SecureLink = z.infer<typeof SecureLinkSchema>;

export type SecureLinkValidationResult =
  | { status: 'not_found' }
  | { status: 'expired'; link: SecureLink }
  | { status: 'consumed'; link: SecureLink }
  | { status: 'ok'; link: SecureLink; rfqId: string };
