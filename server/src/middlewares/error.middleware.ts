import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Error as MongooseError } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

export const errorMiddleware = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    console.error('ApiError:', err.statusCode, err.message, err.errors);
    res.status(err.statusCode).json({ success: false, message: err.message, errors: err.errors });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof MongooseError.CastError) {
    res.status(400).json({ success: false, message: 'Invalid identifier', errors: [] });
    return;
  }

  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({ success: false, message: 'Duplicate value exists', errors: [] });
    return;
  }

  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error', errors: [] });
};
