import bcrypt from 'bcryptjs';
import { ApiError } from '../utils/ApiError.js';
import { UserModel } from '../models/User.model.js';
import { WorkspaceMemberModel } from '../models/WorkspaceMember.model.js';
import { createDefaultWorkspace } from './workspace.service.js';
import { signToken } from './token.service.js';
import { logActivity } from './activity.service.js';
import type { SafeUser } from '../types/index.js';

const toSafeUser = (user: {
  _id: { toString(): string };
  name: string;
  email: string;
  avatar: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const registerUser = async (data: { name: string; email: string; password: string }) => {
  const existingUser = await UserModel.findOne({ email: data.email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, 'Email is already in use');
  }

  const user = await UserModel.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: data.password,
    avatar: '',
  });

  const workspace = await createDefaultWorkspace(user._id.toString(), user.name);
  await logActivity({
    workspace: workspace._id.toString(),
    user: user._id.toString(),
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: user._id.toString(),
    metadata: { email: user.email },
  });

  const token = signToken({ id: user._id.toString(), email: user.email });
  return { user: toSafeUser(user.toObject()), token };
};

export const loginUser = async (data: { email: string; password: string }) => {
  const user = await UserModel.findOne({ email: data.email.toLowerCase() }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken({ id: user._id.toString(), email: user.email });
  return { user: toSafeUser(user.toObject()), token };
};

export const getCurrentUser = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return toSafeUser(user.toObject());
};
