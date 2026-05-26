import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type { DocumentType, ProjectFile } from '../features/files/file.types';

export const fileApi = {
  upload: async (payload: { projectId: string; file: File; documentType: DocumentType }) => {
    const formData = new FormData();
    formData.append('projectId', payload.projectId);
    formData.append('documentType', payload.documentType);
    formData.append('file', payload.file);

    const response = await api.post<ApiResponse<{ file: ProjectFile }>>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data.file;
  },
  listByProject: async (projectId: string) => {
    const response = await api.get<ApiResponse<{ files: ProjectFile[] }>>(`/files/project/${projectId}`);
    return response.data.data.files;
  },
  remove: async (fileId: string) => {
    const response = await api.delete<ApiResponse<Record<string, never>>>(`/files/${fileId}`);
    return response.data.data;
  },
};
