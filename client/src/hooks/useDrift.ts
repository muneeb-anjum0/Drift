import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { driftApi } from '../api/drift.api';

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

export const useAnalyzeDirectDrift = () =>
  useMutation({
    mutationFn: (payload: Parameters<typeof driftApi.analyzeDirect>[0]) => driftApi.analyzeDirect(payload),
  });

export const useSaveDriftAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof driftApi.saveDriftAnalysis>[0]) => driftApi.saveDriftAnalysis(payload),
    onSuccess: async (_analysis, payload) => {
      await invalidateDriftQueries(queryClient, payload.projectId);
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
