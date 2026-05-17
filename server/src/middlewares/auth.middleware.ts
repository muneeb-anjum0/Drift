import type { NextFunction, Request, Response } from 'express';
import { auth } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import type { JwtUserPayload } from '../types/index.js';

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    // Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);
    const user: JwtUserPayload = {
      id: decodedToken.uid,
      email: decodedToken.email || '',
    };

    req.user = user;
    req.userId = decodedToken.uid;
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};
