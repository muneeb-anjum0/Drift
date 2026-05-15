import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api/project.api';

export const useProjects = (workspaceId?: string) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['projects', workspaceId ?? 'all'],
    queryFn: () => projectApi.list(workspaceId),
  });

  const createMutation = useMutation({
    mutationFn: projectApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: Parameters<typeof projectApi.update>[1] }) =>
      projectApi.update(projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  return {
    projects: query.data ?? [],
    createProject: createMutation.mutateAsync,
    updateProject: updateMutation.mutateAsync,
    deleteProject: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    ...query,
  };
};
