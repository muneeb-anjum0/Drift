import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type { Workspace } from '../types';

export const workspaceApi = {
  list: async () => {
    const response = await api.get<ApiResponse<{ workspaces: Workspace[] }>>('/workspaces');
    return response.data.data.workspaces;
  },
  getById: async (workspaceId: string) => {
    const response = await api.get<ApiResponse<{ workspace: Workspace }>>(`/workspaces/${workspaceId}`);
    return response.data.data.workspace;
  },
  create: async (payload: { name: string; description?: string }) => {
    const response = await api.post<ApiResponse<{ workspace: Workspace }>>('/workspaces', payload);
    return response.data.data.workspace;
  },
  update: async (workspaceId: string, payload: { name?: string; description?: string }) => {
    const response = await api.patch<ApiResponse<{ workspace: Workspace }>>(`/workspaces/${workspaceId}`, payload);
    return response.data.data.workspace;
  },
  remove: async (workspaceId: string) => {
    const response = await api.delete<ApiResponse<Record<string, never>>>(`/workspaces/${workspaceId}`);
    return response.data.data;
  },
};
