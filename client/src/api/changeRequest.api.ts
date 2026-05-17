import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type { ChangeRequest, ChangeRequestDraft } from '../features/change-requests/changeRequest.types';

export const changeRequestApi = {
  generateChangeRequest: async (payload: { driftAnalysisId: string; useOllama?: boolean; ollamaModel?: string }) => {
    const response = await api.post<ApiResponse<{ changeRequest: ChangeRequestDraft }>>('/change-requests/generate', payload);
    return response.data.data.changeRequest;
  },
  saveChangeRequest: async (payload: ChangeRequestDraft) => {
    const response = await api.post<ApiResponse<{ changeRequest: ChangeRequest }>>('/change-requests', payload);
    return response.data.data.changeRequest;
  },
  getProjectChangeRequests: async (projectId: string) => {
    const response = await api.get<ApiResponse<{ changeRequests: ChangeRequest[] }>>(`/change-requests/project/${projectId}`);
    return response.data.data.changeRequests;
  },
  getChangeRequest: async (changeRequestId: string) => {
    const response = await api.get<ApiResponse<{ changeRequest: ChangeRequest }>>(`/change-requests/${changeRequestId}`);
    return response.data.data.changeRequest;
  },
  updateChangeRequest: async (
    changeRequestId: string,
    payload: Partial<Pick<ChangeRequest, 'title' | 'summary' | 'businessReason' | 'timelineImpact' | 'costImpact' | 'recommendedAction' | 'approvalNote' | 'status'>>
  ) => {
    const response = await api.patch<ApiResponse<{ changeRequest: ChangeRequest }>>(`/change-requests/${changeRequestId}`, payload);
    return response.data.data.changeRequest;
  },
  deleteChangeRequest: async (changeRequestId: string) => {
    const response = await api.delete<ApiResponse<Record<string, never>>>(`/change-requests/${changeRequestId}`);
    return response.data.data;
  },
};
