import { useQuery } from '@tanstack/react-query';
// Services
import { getSubscriptionStatus } from 'services/notifications/notifications.service';

export const useSubscriptionStatus = (userId) => {
  return useQuery({
    queryKey: ['subscription', userId],
    queryFn: () => getSubscriptionStatus(userId),
    enabled: !!userId,
  });
};
