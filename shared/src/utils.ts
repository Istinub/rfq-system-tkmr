import { randomBytes } from 'crypto';
import type { SafeParseReturnType, ZodTypeAny } from 'zod';

export const generateToken = (): string => randomBytes(32).toString('hex');

export const validate = <Schema extends ZodTypeAny>(
  schema: Schema,
  data: unknown
): SafeParseReturnType<unknown, Schema['_output']> => schema.safeParse(data);