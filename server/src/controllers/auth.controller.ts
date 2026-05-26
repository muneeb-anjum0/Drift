import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { firestore } from '../config/firebase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';
import { getCurrentUser } from '../services/firebaseUser.service.js';
import { createDefaultWorkspace } from '../services/firestoreWorkspace.service.js';
import { signToken } from '../services/token.service.js';

const USERS_COLLECTION = 'users';

interface StoredUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  passwordHash?: string;
  provider?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const payload = registerSchema.parse(req.body);
  const email = payload.email.trim().toLowerCase();
  const name = payload.name.trim();

  const existingUsers = await firestore.collection(USERS_COLLECTION).where('email', '==', email).limit(1).get();

  if (!existingUsers.empty) {
    throw new ApiError(409, 'Email already registered');
  }

  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const now = new Date();

  const userRecord: StoredUser = {
    uid: userId,
    email,
    displayName: name,
    photoURL: '',
    passwordHash,
    provider: 'local',
    createdAt: now,
    updatedAt: now,
  };

  await firestore.collection(USERS_COLLECTION).doc(userId).set(userRecord);
  await createDefaultWorkspace(userId, name);

  const user = await getCurrentUser(userId);
  const token = signToken({ id: userId, email });

  res.status(201).json(new ApiResponse('Registration successful', { user, token }));
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const payload = loginSchema.parse(req.body);
  const email = payload.email.trim().toLowerCase();

  const matchingUsers = await firestore.collection(USERS_COLLECTION).where('email', '==', email).limit(1).get();

  if (matchingUsers.empty) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const userDoc = matchingUsers.docs[0];
  const userData = userDoc.data() as StoredUser;

  if (!userData.passwordHash) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(payload.password, userData.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const user = await getCurrentUser(userDoc.id);
  const token = signToken({ id: userDoc.id, email: userData.email });

  res.status(200).json(new ApiResponse('Login successful', { user, token }));
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req.user!.id);
  res.status(200).json(new ApiResponse('Current user fetched', { user }));
});

export const logoutController = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(new ApiResponse('Logout successful', {}));
});
