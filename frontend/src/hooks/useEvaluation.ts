import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { evaluationApi } from '../api/evaluation.api';
import type { EvaluationRun } from '../features/evaluation/evaluation.types';

const isActiveRun = (run?: EvaluationRun | null) => run?.status === 'queued' || run?.status === 'running';

export const useEvaluationSummary = () => {
  return useQuery({
    queryKey: ['evaluation-summary'],
    queryFn: evaluationApi.summary,
    staleTime: 30_000,
    refetchInterval: (query) => (isActiveRun(query.state.data?.currentRun) ? 2500 : false),
  });
};

export const useEvaluationRun = () => {
  return useQuery({
    queryKey: ['evaluation-run'],
    queryFn: evaluationApi.currentRun,
    refetchInterval: (query) => (isActiveRun(query.state.data) ? 2500 : false),
  });
};

export const useStartEvaluationRun = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: evaluationApi.startRun,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['evaluation-run'] }),
        queryClient.invalidateQueries({ queryKey: ['evaluation-summary'] }),
      ]);
    },
  });
};
