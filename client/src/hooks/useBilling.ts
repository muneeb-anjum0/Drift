import { useQuery } from '@tanstack/react-query';
import { billingApi } from '../api/billing.api';

export const useBillingSummary = () =>
  useQuery({
    queryKey: ['billing-summary'],
    queryFn: billingApi.summary,
  });
