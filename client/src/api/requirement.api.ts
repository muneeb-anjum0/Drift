import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type {
  Requirement,
  RequirementBaselinePayload,
  RequirementCreatePayload,
  RequirementExtractionSuggestion,
  RequirementUpdatePayload,
  RequirementVersion,
} from '../features/requirements/requirement.types';

export const requirementApi = {
  getProjectRequirements: async (projectId: string) => {
    const response = await api.get<ApiResponse<{ requirements: Requirement[] }>>(`/requirements/project/${projectId}`);
    return response.data.data.requirements;
  },
  getRequirement: async (requirementId: string) => {
    const response = await api.get<ApiResponse<{ requirement: Requirement }>>(`/requirements/${requirementId}`);
    return response.data.data.requirement;
  },
  createRequirement: async (payload: RequirementCreatePayload) => {
    const response = await api.post<ApiResponse<{ requirement: Requirement }>>('/requirements', payload);
    return response.data.data.requirement;
  },
  updateRequirement: async (requirementId: string, payload: RequirementUpdatePayload) => {
    const response = await api.patch<ApiResponse<{ requirement: Requirement }>>(`/requirements/${requirementId}`, payload);
    return response.data.data.requirement;
  },
  deleteRequirement: async (requirementId: string) => {
    const response = await api.delete<ApiResponse<Record<string, never>>>(`/requirements/${requirementId}`);
    return response.data.data;
  },
  extractRequirements: async (payload: { projectId: string; sourceText: string; source?: RequirementExtractionSuggestion['source'] }) => {
    const response = await api.post<ApiResponse<{ suggestions: RequirementExtractionSuggestion[] }>>('/requirements/extract', payload);
    return response.data.data.suggestions;
  },
  createRequirementBaseline: async (payload: RequirementBaselinePayload) => {
    const response = await api.post<ApiResponse<{ version: RequirementVersion }>>('/requirements/baseline', payload);
    return response.data.data.version;
  },
  getRequirementVersions: async (projectId: string) => {
    const response = await api.get<ApiResponse<{ versions: RequirementVersion[] }>>(`/requirements/versions/${projectId}`);
    return response.data.data.versions;
  },
};
