import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../api/workspace.api';

export const useWorkspaces = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.list,
  });

  const createMutation = useMutation({
    mutationFn: workspaceApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ workspaceId, payload }: { workspaceId: string; payload: { name?: string; description?: string } }) =>
      workspaceApi.update(workspaceId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: workspaceApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  return {
    workspaces: query.data ?? [],
    createWorkspace: createMutation.mutateAsync,
    updateWorkspace: updateMutation.mutateAsync,
    deleteWorkspace: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    ...query,
  };
};
