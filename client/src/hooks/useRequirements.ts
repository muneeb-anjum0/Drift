import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requirementApi } from '../api/requirement.api';
import type {
  RequirementBaselinePayload,
  RequirementCreatePayload,
  RequirementExtractionSuggestion,
  RequirementUpdatePayload,
} from '../features/requirements/requirement.types';

const invalidateRequirementQueries = async (queryClient: ReturnType<typeof useQueryClient>, projectId: string) => {
  await queryClient.invalidateQueries({ queryKey: ['project-requirements', projectId] });
  await queryClient.invalidateQueries({ queryKey: ['requirement-versions', projectId] });
  await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
  await queryClient.invalidateQueries({ queryKey: ['activities'] });
};

export const useProjectRequirements = (projectId?: string) =>
  useQuery({
    queryKey: ['project-requirements', projectId ?? ''],
    queryFn: () => requirementApi.getProjectRequirements(projectId ?? ''),
    enabled: Boolean(projectId),
  });

export const useRequirementVersions = (projectId?: string) =>
  useQuery({
    queryKey: ['requirement-versions', projectId ?? ''],
    queryFn: () => requirementApi.getRequirementVersions(projectId ?? ''),
    enabled: Boolean(projectId),
  });

export const useCreateRequirement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RequirementCreatePayload) => requirementApi.createRequirement(payload),
    onSuccess: async (_requirement, payload) => {
      await invalidateRequirementQueries(queryClient, payload.projectId);
    },
  });
};

export const useUpdateRequirement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { requirementId: string; projectId: string; payload: RequirementUpdatePayload }) =>
      requirementApi.updateRequirement(variables.requirementId, variables.payload),
    onSuccess: async (_requirement, variables) => {
      await invalidateRequirementQueries(queryClient, variables.projectId);
    },
  });
};

export const useDeleteRequirement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { requirementId: string; projectId: string }) => requirementApi.deleteRequirement(variables.requirementId),
    onSuccess: async (_data, variables) => {
      await invalidateRequirementQueries(queryClient, variables.projectId);
    },
  });
};

export const useExtractRequirements = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; sourceText: string; source?: RequirementExtractionSuggestion['source'] }) =>
      requirementApi.extractRequirements(payload),
    onSuccess: async (_suggestions, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      await queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
};

export const useCreateBaseline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RequirementBaselinePayload) => requirementApi.createRequirementBaseline(payload),
    onSuccess: async (version, payload) => {
      await invalidateRequirementQueries(queryClient, payload.projectId);
      return version;
    },
  });
};
