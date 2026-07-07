import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type { EvaluationReportFile, EvaluationSummary } from '../features/evaluation/evaluation.types';

export const evaluationApi = {
  summary: async () => {
    const { data } = await api.get<ApiResponse<{ summary: EvaluationSummary }>>('/evaluation/summary');
    return data.data.summary;
  },
  reports: async () => {
    const { data } = await api.get<ApiResponse<{ reports: EvaluationReportFile[] }>>('/evaluation/reports');
    return data.data.reports;
  },
};
