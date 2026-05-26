import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { auth } from '../config/firebase.js';
import { firestore } from '../config/firebase.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import type { JwtUserPayload } from '../types/index.js';

import { ensureUserExists } from '../services/firebaseUser.service.js';

const USERS_COLLECTION = 'users';

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    next(new ApiError(401, 'Authentication required'));
    return;
  }

  try {
    const decodedToken = jwt.verify(token, env.JWT_SECRET) as JwtPayload & Partial<JwtUserPayload>;

    if (typeof decodedToken.id === 'string') {
      const userDoc = await firestore.collection(USERS_COLLECTION).doc(decodedToken.id).get();

      if (!userDoc.exists) {
        next(new ApiError(401, 'Authentication required'));
        return;
      }

      const userData = userDoc.data() as { email?: string } | undefined;
      req.user = {
        id: decodedToken.id,
        email: decodedToken.email || userData?.email || '',
      };
      req.userId = decodedToken.id;
      next();
      return;
    }
  } catch {
    // Fall through to Firebase verification for Firebase-issued ID tokens.
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);
    const user: JwtUserPayload = {
      id: decodedToken.uid,
      email: decodedToken.email || '',
    };

    // Ensure user exists in our Firestore user collection
    await ensureUserExists(decodedToken.uid, decodedToken.email || '', decodedToken.name);

    req.user = user;
    req.userId = decodedToken.uid;
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};
