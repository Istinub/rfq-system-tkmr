import { createHash, randomBytes } from 'crypto';

export const generateToken = (): string => randomBytes(32).toString('hex');

export const hashSubmissionToken = (token: string): string =>
	createHash('sha256').update(token).digest('hex');
