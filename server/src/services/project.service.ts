import { getUserWorkspaces } from './firestoreWorkspace.service.js';
import * as firestoreProjectService from './firestoreProject.service.js';

export const createProject = async (
  userId: string,
  payload: {
    workspaceId: string;
    name: string;
    clientName: string;
    description?: string;
    status?: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    originalScope?: string;
    deadline?: string;
  }
) => firestoreProjectService.createProject(userId, payload.workspaceId, payload);

export const getProjects = async (userId: string, workspaceId?: string) => {
  if (workspaceId) {
    return firestoreProjectService.listProjectsByWorkspace(workspaceId, userId);
  }

  const workspaces = await getUserWorkspaces(userId);
  const projects = await Promise.all(workspaces.map((workspace) => firestoreProjectService.listProjectsByWorkspace(workspace._id, userId)));
  return projects.flat().sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
};

export const getProjectById = firestoreProjectService.getProjectById;
export const updateProject = firestoreProjectService.updateProject;
export const deleteProject = firestoreProjectService.deleteProject;
