import type { Project, Workspace } from '../types';

export const projectWorkspaceId = (project: Project) =>
  typeof project.workspace === 'string' ? project.workspace : project.workspace._id;

export const roleForProject = (project: Project, workspaces: Workspace[]) =>
  workspaces.find((workspace) => workspace._id === projectWorkspaceId(project))?.role;

export const canWrite = (role?: Workspace['role']) => role === 'owner' || role === 'admin' || role === 'member';
export const canApprove = (role?: Workspace['role']) => role === 'owner' || role === 'admin';
export const canManageWorkspace = canApprove;
export const canDeleteWorkspace = (role?: Workspace['role']) => role === 'owner';
