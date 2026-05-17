import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';
import { getCurrentUser } from '../services/firebaseUser.service.js';

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  // Firebase handles registration on the frontend
  // This endpoint is kept for compatibility but not used in Firebase flow
  const payload = registerSchema.parse(req.body);
  res.status(201).json(new ApiResponse('Use Firebase Authentication for registration', {}));
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  // Firebase handles login on the frontend
  // This endpoint is kept for compatibility but not used in Firebase flow
  const payload = loginSchema.parse(req.body);
  res.status(200).json(new ApiResponse('Use Firebase Authentication for login', {}));
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req.user!.id);
  res.status(200).json(new ApiResponse('Current user fetched', { user }));
});

export const logoutController = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(new ApiResponse('Logout successful', {}));
});
