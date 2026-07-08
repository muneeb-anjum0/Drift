import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type { EvaluationReportFile, EvaluationRun, EvaluationSummary } from '../features/evaluation/evaluation.types';

export const evaluationApi = {
  summary: async () => {
    const { data } = await api.get<ApiResponse<{ summary: EvaluationSummary }>>('/evaluation/summary');
    return data.data.summary;
  },
  reports: async () => {
    const { data } = await api.get<ApiResponse<{ reports: EvaluationReportFile[] }>>('/evaluation/reports');
    return data.data.reports;
  },
  startRun: async () => {
    const { data } = await api.post<ApiResponse<{ run: EvaluationRun }>>('/evaluation/runs');
    return data.data.run;
  },
  currentRun: async () => {
    const { data } = await api.get<ApiResponse<{ run: EvaluationRun | null }>>('/evaluation/runs/current');
    return data.data.run;
  },
};
