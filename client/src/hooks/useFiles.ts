import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fileApi } from '../api/file.api';
import type { DocumentType } from '../features/files/file.types';

export const useProjectFiles = (projectId?: string) =>
  useQuery({
    queryKey: ['files', projectId],
    queryFn: () => fileApi.listByProject(projectId ?? ''),
    enabled: Boolean(projectId),
  });

export const useUploadFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { projectId: string; file: File; documentType: DocumentType }) => fileApi.upload(payload),
    onSuccess: async (_file, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['files', variables.projectId] });
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId }: { fileId: string; projectId: string }) => fileApi.remove(fileId),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['files', variables.projectId] });
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
};
