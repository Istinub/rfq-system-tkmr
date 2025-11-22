import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';

export type ValidateTarget = 'body' | 'query' | 'params';

export const validate =
  <Schema extends ZodTypeAny>(schema: Schema, target: ValidateTarget = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      res.status(400).json({
        success: false,
        errors: result.error.issues.map((issue) => issue.message),
      });
      return;
    }

    (req as Record<ValidateTarget, unknown>)[target] = result.data;
    next();
  };