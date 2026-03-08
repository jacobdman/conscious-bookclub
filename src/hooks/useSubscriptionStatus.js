import { useQuery } from '@tanstack/react-query';
// Services
import { getSubscriptionStatus } from 'services/notifications/notifications.service';

const STALE_TIME_MS = 1000 * 60 * 5;

export const useSubscriptionStatus = (userId) => {
  return useQuery({
    queryKey: ['subscription', userId],
    queryFn: () => getSubscriptionStatus(userId),
    enabled: !!userId,
    staleTime: STALE_TIME_MS,
    refetchOnMount: false,
  });
};
