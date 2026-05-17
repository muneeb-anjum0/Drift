import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changeRequestApi } from '../api/changeRequest.api';

const invalidateChangeRequestQueries = async (queryClient: ReturnType<typeof useQueryClient>, projectId: string) => {
  await queryClient.invalidateQueries({ queryKey: ['project-change-requests', projectId] });
  await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
  await queryClient.invalidateQueries({ queryKey: ['activities'] });
};

export const useProjectChangeRequests = (projectId?: string) =>
  useQuery({
    queryKey: ['project-change-requests', projectId ?? ''],
    queryFn: () => changeRequestApi.getProjectChangeRequests(projectId ?? ''),
    enabled: Boolean(projectId),
  });

export const useGenerateChangeRequest = () =>
  useMutation({
    mutationFn: (payload: Parameters<typeof changeRequestApi.generateChangeRequest>[0]) => changeRequestApi.generateChangeRequest(payload),
  });

export const useSaveChangeRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof changeRequestApi.saveChangeRequest>[0]) => changeRequestApi.saveChangeRequest(payload),
    onSuccess: async (changeRequest) => {
      const projectId = typeof changeRequest.project === 'string' ? changeRequest.project : changeRequest.project._id;
      await invalidateChangeRequestQueries(queryClient, projectId);
    },
  });
};

export const useUpdateChangeRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { changeRequestId: string; projectId: string; payload: Parameters<typeof changeRequestApi.updateChangeRequest>[1] }) =>
      changeRequestApi.updateChangeRequest(variables.changeRequestId, variables.payload),
    onSuccess: async (_changeRequest, variables) => {
      await invalidateChangeRequestQueries(queryClient, variables.projectId);
    },
  });
};

export const useDeleteChangeRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { changeRequestId: string; projectId: string }) => changeRequestApi.deleteChangeRequest(variables.changeRequestId),
    onSuccess: async (_data, variables) => {
      await invalidateChangeRequestQueries(queryClient, variables.projectId);
    },
  });
};
