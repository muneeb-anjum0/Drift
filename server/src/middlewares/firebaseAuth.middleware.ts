import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import type { JwtUserPayload } from '../types/index.js';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      throw new ApiError(401, 'No authorization token provided');
    }

    const decodedToken = await auth.verifyIdToken(token);
    const normalizedUser: JwtUserPayload = {
      id: decodedToken.uid, // Map uid to id for compatibility
      email: decodedToken.email || '',
    };

    req.userId = decodedToken.uid;
    req.user = normalizedUser;

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Invalid or expired token');
  }
};
