import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type { BillingSummary } from '../features/billing/billing.types';

export const billingApi = {
  summary: async () => {
    const { data } = await api.get<ApiResponse<{ summary: BillingSummary }>>('/billing/summary');
    return data.data.summary;
  },
};
