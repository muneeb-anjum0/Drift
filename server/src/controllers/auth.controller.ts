import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';
import { getCurrentUser, loginUser, registerUser } from '../services/auth.service.js';

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const payload = registerSchema.parse(req.body);
  const result = await registerUser(payload);
  res.status(201).json(new ApiResponse('Registration successful', result));
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const payload = loginSchema.parse(req.body);
  const result = await loginUser(payload);
  res.status(200).json(new ApiResponse('Login successful', result));
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req.user!.id);
  res.status(200).json(new ApiResponse('Current user fetched', { user }));
});

export const logoutController = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(new ApiResponse('Logout successful', {}));
});
