import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { activityApi } from '../api/activity.api';

export const useActivities = () => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['activities'],
    queryFn: activityApi.list,
    enabled: !!user, // Only fetch when user is authenticated
  });

  return {
    activities: query.data ?? [],
    ...query,
  };
};
