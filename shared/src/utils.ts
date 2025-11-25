import type { SafeParseReturnType, ZodTypeAny } from 'zod';

export const validate = <Schema extends ZodTypeAny>(
  schema: Schema,
  data: unknown
): SafeParseReturnType<unknown, Schema['_output']> => schema.safeParse(data);