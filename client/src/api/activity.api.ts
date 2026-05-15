import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type { ActivityLog } from '../types';

export const activityApi = {
  list: async () => {
    const response = await api.get<ApiResponse<{ activities: ActivityLog[] }>>('/activities');
    return response.data.data.activities;
  },
};
