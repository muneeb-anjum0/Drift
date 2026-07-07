import { useQuery } from '@tanstack/react-query';
import { evaluationApi } from '../api/evaluation.api';

export const useEvaluationSummary = () => {
  return useQuery({
    queryKey: ['evaluation-summary'],
    queryFn: evaluationApi.summary,
    staleTime: 30_000,
  });
};
