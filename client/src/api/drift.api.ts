import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type { DriftAnalysis, DriftAnalysisPreview, DriftInputType, ModelPrediction } from '../features/drift/drift.types';

export const driftApi = {
  analyzeDrift: async (payload: {
    projectId: string;
    baselineVersionId: string;
    inputText: string;
    inputType?: DriftInputType;
    ollamaModel?: string;
  }) => {
    const response = await api.post<ApiResponse<{ analysis: DriftAnalysisPreview }>>('/drift/analyze', payload);
    return response.data.data.analysis;
  },
  analyzeDirect: async (payload: {
    baseline_requirement: string;
    new_client_message: string;
  }) => {
    const response = await api.post<ApiResponse<{ prediction: ModelPrediction }>>('/drift/analyze-direct', payload);
    return response.data.data.prediction;
  },
  saveDriftAnalysis: async (payload: {
    projectId: string;
    baselineVersionId: string;
    inputText: string;
    inputType?: DriftInputType;
    detectedChanges: DriftAnalysisPreview['detectedChanges'];
    requirementResults?: DriftAnalysisPreview['requirementResults'];
    driftScore: number;
    riskLevel: DriftAnalysisPreview['riskLevel'];
    summary: string;
    addedCount: number;
    modifiedCount: number;
    removedCount: number;
    ambiguousCount: number;
    contradictionCount: number;
    estimatedExtraHours: number;
    analysisEngine: DriftAnalysisPreview['analysisEngine'];
    ollamaUsed: boolean;
    ollamaModel?: string | null;
    status?: DriftAnalysis['status'];
  }) => {
    const response = await api.post<ApiResponse<{ analysis: DriftAnalysis }>>('/drift/save', payload);
    return response.data.data.analysis;
  },
  getProjectDriftAnalyses: async (projectId: string) => {
    const response = await api.get<ApiResponse<{ analyses: DriftAnalysis[] }>>(`/drift/project/${projectId}`);
    return response.data.data.analyses;
  },
  getDriftAnalysis: async (driftAnalysisId: string) => {
    const response = await api.get<ApiResponse<{ analysis: DriftAnalysis }>>(`/drift/${driftAnalysisId}`);
    return response.data.data.analysis;
  },
  deleteDriftAnalysis: async (driftAnalysisId: string) => {
    const response = await api.delete<ApiResponse<Record<string, never>>>(`/drift/${driftAnalysisId}`);
    return response.data.data;
  },
};
