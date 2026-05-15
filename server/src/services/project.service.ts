import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { ProjectModel } from '../models/Project.model.js';
import { WorkspaceModel } from '../models/Workspace.model.js';
import { WorkspaceMemberModel } from '../models/WorkspaceMember.model.js';
import { logActivity } from './activity.service.js';

const ensureProjectAccess = async (projectId: string, userId: string) => {
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const member = await WorkspaceMemberModel.findOne({ workspace: project.workspace, user: userId });
  if (!member) {
    throw new ApiError(403, 'You do not have access to this project');
  }

  return project;
};

const ensureWorkspaceAccess = async (workspaceId: string, userId: string) => {
  if (!Types.ObjectId.isValid(workspaceId)) {
    throw new ApiError(400, 'Invalid workspace id');
  }

  const member = await WorkspaceMemberModel.findOne({ workspace: workspaceId, user: userId });
  if (!member) {
    throw new ApiError(403, 'You do not have access to this workspace');
  }
};

export const createProject = async (userId: string, data: {
  workspaceId: string;
  name: string;
  clientName: string;
  description?: string;
  status?: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  originalScope?: string;
  deadline?: string;
}) => {
  await ensureWorkspaceAccess(data.workspaceId, userId);

  const workspace = await WorkspaceModel.findById(data.workspaceId);
  if (!workspace) {
    throw new ApiError(404, 'Workspace not found');
  }

  const project = await ProjectModel.create({
    workspace: data.workspaceId,
    name: data.name,
    clientName: data.clientName,
    description: data.description ?? '',
    status: data.status ?? 'planning',
    priority: data.priority ?? 'medium',
    originalScope: data.originalScope ?? '',
    deadline: data.deadline ? new Date(data.deadline) : undefined,
    createdBy: userId,
  });

  await logActivity({
    workspace: data.workspaceId,
    user: userId,
    action: 'PROJECT_CREATED',
    entityType: 'Project',
    entityId: project._id.toString(),
    metadata: { name: project.name, clientName: project.clientName },
  });

  return project;
};

export const getProjects = async (userId: string, workspaceId?: string) => {
  const memberships = await WorkspaceMemberModel.find({ user: userId }).select('workspace');
  const workspaceIds = memberships.map((member) => member.workspace.toString());

  const query: Record<string, unknown> = { workspace: { $in: workspaceIds } };
  if (workspaceId) {
    if (!Types.ObjectId.isValid(workspaceId)) {
      throw new ApiError(400, 'Invalid workspace id');
    }
    query.workspace = workspaceId;
  }

  return ProjectModel.find(query)
    .sort({ createdAt: -1 })
    .populate('workspace', 'name slug')
    .populate('createdBy', 'name email');
};

export const getProjectById = async (projectId: string, userId: string) => {
  if (!Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, 'Invalid project id');
  }

  const project = await ensureProjectAccess(projectId, userId);
  return ProjectModel.findById(project._id)
    .populate('workspace', 'name slug')
    .populate('createdBy', 'name email');
};

export const updateProject = async (projectId: string, userId: string, data: {
  name?: string;
  clientName?: string;
  description?: string;
  status?: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  originalScope?: string;
  deadline?: string;
}) => {
  const project = await ensureProjectAccess(projectId, userId);

  if (data.name !== undefined) project.name = data.name;
  if (data.clientName !== undefined) project.clientName = data.clientName;
  if (data.description !== undefined) project.description = data.description;
  if (data.status !== undefined) project.status = data.status;
  if (data.priority !== undefined) project.priority = data.priority;
  if (data.originalScope !== undefined) project.originalScope = data.originalScope;
  if (data.deadline !== undefined) project.deadline = data.deadline ? new Date(data.deadline) : undefined;

  await project.save();

  await logActivity({
    workspace: project.workspace.toString(),
    user: userId,
    action: 'PROJECT_UPDATED',
    entityType: 'Project',
    entityId: project._id.toString(),
    metadata: { name: project.name },
  });

  return project;
};

export const deleteProject = async (projectId: string, userId: string) => {
  const project = await ensureProjectAccess(projectId, userId);
  await ProjectModel.findByIdAndDelete(projectId);

  await logActivity({
    workspace: project.workspace.toString(),
    user: userId,
    action: 'PROJECT_DELETED',
    entityType: 'Project',
    entityId: projectId,
    metadata: { name: project.name },
  });

  return project;
};
