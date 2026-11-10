import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type { Project } from '../types';

export const projectApi = {
  list: async (workspaceId?: string) => {
    const response = await api.get<ApiResponse<{ projects: Project[] }>>('/projects', {
      params: workspaceId ? { workspaceId } : undefined,
    });
    return response.data.data.projects;
  },
  getById: async (projectId: string) => {
    const response = await api.get<ApiResponse<{ project: Project }>>(`/projects/${projectId}`);
    return response.data.data.project;
  },
  create: async (payload: {
    workspaceId: string;
    name: string;
    clientName: string;
    description?: string;
    status?: Project['status'];
    priority?: Project['priority'];
    originalScope?: string;
    deadline?: string;
  }) => {
    const response = await api.post<ApiResponse<{ project: Project }>>('/projects', payload);
    return response.data.data.project;
  },
  update: async (projectId: string, payload: Partial<Omit<Project, '_id' | 'workspace' | 'createdBy' | 'createdAt' | 'updatedAt'>>) => {
    const response = await api.patch<ApiResponse<{ project: Project }>>(`/projects/${projectId}`, payload);
    return response.data.data.project;
  },
  remove: async (projectId: string) => {
    const response = await api.delete<ApiResponse<Record<string, never>>>(`/projects/${projectId}`);
    return response.data.data;
  },
};
