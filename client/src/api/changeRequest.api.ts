import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type { ChangeRequest, ChangeRequestDraft } from '../features/change-requests/changeRequest.types';

export interface ApprovalDecisionPayload {
  note?: string;
}

export const changeRequestApi = {
  generateChangeRequest: async (payload: { driftAnalysisId: string }) => {
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
  getApprovals: async () => {
    const response = await api.get<ApiResponse<{ changeRequests: ChangeRequest[] }>>('/change-requests/approvals');
    return response.data.data.changeRequests;
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
  submitForApproval: async (changeRequestId: string, payload: ApprovalDecisionPayload = {}) => {
    const response = await api.post<ApiResponse<{ changeRequest: ChangeRequest }>>(`/change-requests/${changeRequestId}/submit`, payload);
    return response.data.data.changeRequest;
  },
  approveChangeRequest: async (changeRequestId: string, payload: ApprovalDecisionPayload = {}) => {
    const response = await api.post<ApiResponse<{ changeRequest: ChangeRequest }>>(`/change-requests/${changeRequestId}/approve`, payload);
    return response.data.data.changeRequest;
  },
  rejectChangeRequest: async (changeRequestId: string, payload: ApprovalDecisionPayload = {}) => {
    const response = await api.post<ApiResponse<{ changeRequest: ChangeRequest }>>(`/change-requests/${changeRequestId}/reject`, payload);
    return response.data.data.changeRequest;
  },
  requestRevision: async (changeRequestId: string, payload: ApprovalDecisionPayload = {}) => {
    const response = await api.post<ApiResponse<{ changeRequest: ChangeRequest }>>(`/change-requests/${changeRequestId}/needs-revision`, payload);
    return response.data.data.changeRequest;
  },
};
