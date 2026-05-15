import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { WorkspaceModel } from '../models/Workspace.model.js';
import { WorkspaceMemberModel } from '../models/WorkspaceMember.model.js';
import { logActivity } from './activity.service.js';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const makeUniqueSlug = async (name: string) => {
  const baseSlug = slugify(name) || 'workspace';
  const existing = await WorkspaceModel.countDocuments({ slug: new RegExp(`^${baseSlug}`) });
  return existing === 0 ? baseSlug : `${baseSlug}-${existing + 1}`;
};

const ensureWorkspaceAccess = async (workspaceId: string, userId: string) => {
  const member = await WorkspaceMemberModel.findOne({ workspace: workspaceId, user: userId });
  if (!member) {
    throw new ApiError(403, 'You do not have access to this workspace');
  }
  return member;
};

export const createDefaultWorkspace = async (userId: string, userName: string) => {
  const workspaceName = `${userName.split(' ')[0] || 'My'} Workspace`;
  const workspace = await WorkspaceModel.create({
    name: workspaceName,
    slug: await makeUniqueSlug(workspaceName),
    owner: userId,
    description: 'Default workspace created during onboarding',
  });

  await WorkspaceMemberModel.create({ workspace: workspace._id, user: userId, role: 'owner' });

  await logActivity({
    workspace: workspace._id.toString(),
    user: userId,
    action: 'WORKSPACE_CREATED',
    entityType: 'Workspace',
    entityId: workspace._id.toString(),
    metadata: { source: 'default-workspace' },
  });

  return workspace;
};

export const createWorkspace = async (userId: string, name: string, description = '') => {
  const workspace = await WorkspaceModel.create({
    name,
    slug: await makeUniqueSlug(name),
    owner: userId,
    description,
  });

  await WorkspaceMemberModel.create({ workspace: workspace._id, user: userId, role: 'owner' });

  await logActivity({
    workspace: workspace._id.toString(),
    user: userId,
    action: 'WORKSPACE_CREATED',
    entityType: 'Workspace',
    entityId: workspace._id.toString(),
    metadata: { name },
  });

  return workspace;
};

export const getUserWorkspaces = async (userId: string) => {
  const memberships = await WorkspaceMemberModel.find({ user: userId }).populate('workspace');
  return memberships.map((membership) => membership.workspace).filter(Boolean);
};

export const getWorkspaceById = async (workspaceId: string, userId: string) => {
  if (!Types.ObjectId.isValid(workspaceId)) {
    throw new ApiError(400, 'Invalid workspace id');
  }

  await ensureWorkspaceAccess(workspaceId, userId);
  const workspace = await WorkspaceModel.findById(workspaceId).populate('owner', 'name email');

  if (!workspace) {
    throw new ApiError(404, 'Workspace not found');
  }

  return workspace;
};

export const updateWorkspace = async (workspaceId: string, userId: string, data: { name?: string; description?: string }) => {
  await ensureWorkspaceAccess(workspaceId, userId);
  const workspace = await WorkspaceModel.findById(workspaceId);

  if (!workspace) {
    throw new ApiError(404, 'Workspace not found');
  }

  if (data.name && data.name !== workspace.name) {
    workspace.name = data.name;
    workspace.slug = await makeUniqueSlug(data.name);
  }

  if (typeof data.description === 'string') {
    workspace.description = data.description;
  }

  await workspace.save();
  return workspace;
};

export const deleteWorkspace = async (workspaceId: string, userId: string) => {
  await ensureWorkspaceAccess(workspaceId, userId);
  const workspace = await WorkspaceModel.findByIdAndDelete(workspaceId);

  if (!workspace) {
    throw new ApiError(404, 'Workspace not found');
  }

  await WorkspaceMemberModel.deleteMany({ workspace: workspaceId });
  await logActivity({
    workspace: workspaceId,
    user: userId,
    action: 'WORKSPACE_DELETED',
    entityType: 'Workspace',
    entityId: workspaceId,
    metadata: { name: workspace.name },
  });

  return workspace;
};

export const assertWorkspaceAccess = ensureWorkspaceAccess;
