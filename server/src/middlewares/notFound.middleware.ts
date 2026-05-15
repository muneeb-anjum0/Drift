import type { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';

export const notFoundMiddleware = (req: Request, _res: Response) => {
  throw new ApiError(404, `Route not found: ${req.originalUrl}`);
};
