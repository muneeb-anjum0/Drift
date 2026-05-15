import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { JwtUserPayload } from '../types/index.js';

export const signToken = (payload: JwtUserPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
};
