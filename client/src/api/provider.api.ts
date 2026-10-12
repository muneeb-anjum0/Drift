import { api } from './axios';
import type { ApiResponse } from '../types/api.types';

export type ProviderMetadata = {
  providerType: 'local' | 'openai_compatible';
  displayName: string;
  endpoint?: string;
  model?: string;
  credentialConfigured: boolean;
  lastValidatedAt?: string;
  lastValidationStatus?: string;
};

export type ProviderWrite = {
  providerType: 'openai_compatible';
  displayName: string;
  endpoint: string;
  model: string;
  apiKey: string;
  privacyAcknowledged: boolean;
};

export const providerApi = {
  get: async (workspaceId: string) => {
    const response = await api.get<ApiResponse<{ provider: ProviderMetadata }>>(`/workspaces/${workspaceId}/provider`);
    return response.data.data.provider;
  },
  test: async (workspaceId: string, payload: Partial<ProviderWrite>) => {
    await api.post(`/workspaces/${workspaceId}/provider/test`, payload);
  },
  save: async (workspaceId: string, payload: ProviderWrite) => {
    const response = await api.put<ApiResponse<{ provider: ProviderMetadata }>>(`/workspaces/${workspaceId}/provider`, payload);
    return response.data.data.provider;
  },
  remove: async (workspaceId: string) => {
    const response = await api.delete<ApiResponse<{ provider: ProviderMetadata }>>(`/workspaces/${workspaceId}/provider`);
    return response.data.data.provider;
  },
};
