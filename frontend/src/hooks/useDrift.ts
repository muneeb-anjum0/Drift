import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { driftApi } from '../api/drift.api';

export const useChangeReadiness = (workspaceId?: string) => useQuery({
  queryKey: ['change-readiness', workspaceId ?? 'local-diagnostic'],
  queryFn: () => driftApi.readiness(workspaceId),
  staleTime: 15_000,
  retry: 1,
});

const invalidateDriftQueries = async (queryClient: ReturnType<typeof useQueryClient>, projectId: string) => {
  await queryClient.invalidateQueries({ queryKey: ['project-drift-analyses', projectId] });
  await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
  await queryClient.invalidateQueries({ queryKey: ['activities'] });
};

export const useProjectDriftAnalyses = (projectId?: string) =>
  useQuery({
    queryKey: ['project-drift-analyses', projectId ?? ''],
    queryFn: () => driftApi.getProjectDriftAnalyses(projectId ?? ''),
    enabled: Boolean(projectId),
  });

export const useAnalyzeDrift = () =>
  useMutation({
    mutationFn: (payload: Parameters<typeof driftApi.analyzeDrift>[0]) => driftApi.analyzeDrift(payload),
  });

export const useStartScopeJob = () => useMutation({
  mutationFn: (payload: Parameters<typeof driftApi.startScopeJob>[0]) => driftApi.startScopeJob(payload),
});

export const useCancelScopeJob = () => useMutation({ mutationFn: (jobId: string) => driftApi.cancelScopeJob(jobId) });

export const useScopeJob = (jobId: string) => useQuery({
  queryKey: ['scope-job', jobId],
  queryFn: () => driftApi.getScopeJob(jobId),
  enabled: Boolean(jobId),
  refetchInterval: (query) => ['complete', 'failed', 'canceled'].includes(query.state.data?.status ?? '') ? false : 2000,
});

export const useAnalyzeDirectDrift = () =>
  useMutation({
    mutationFn: (payload: Parameters<typeof driftApi.analyzeDirect>[0]) => driftApi.analyzeDirect(payload),
  });

export const useSaveDriftAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof driftApi.saveDriftAnalysis>[0]) => driftApi.saveDriftAnalysis(payload),
    onSuccess: async (analysis) => {
      const projectId = typeof analysis.project === 'string' ? analysis.project : analysis.project._id;
      await invalidateDriftQueries(queryClient, projectId);
    },
  });
};

export const useDeleteDriftAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { driftAnalysisId: string; projectId: string }) => driftApi.deleteDriftAnalysis(variables.driftAnalysisId),
    onSuccess: async (_data, variables) => {
      await invalidateDriftQueries(queryClient, variables.projectId);
    },
  });
};
