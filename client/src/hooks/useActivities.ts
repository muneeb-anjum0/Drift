import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../api/activity.api';

export const useActivities = () => {
  const query = useQuery({
    queryKey: ['activities'],
    queryFn: activityApi.list,
  });

  return {
    activities: query.data ?? [],
    ...query,
  };
};
