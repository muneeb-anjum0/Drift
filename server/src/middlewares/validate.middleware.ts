import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const validate = (schema: ZodTypeAny, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(new ApiError(400, 'Validation failed', result.error.flatten().fieldErrors as unknown[]));
      return;
    }

    req[source] = result.data;
    next();
  };
};
