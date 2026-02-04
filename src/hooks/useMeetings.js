import { useQuery } from '@tanstack/react-query';
// Services
import { getMeetings } from 'services/meetings/meetings.service';

export const useMeetings = (clubId, userId, options = {}) => {
  const { startDate, limit = null } = options;

  return useQuery({
    queryKey: ['meetings', clubId, userId, startDate, limit],
    queryFn: () => getMeetings(clubId, userId, startDate, null, limit),
    enabled: !!clubId && !!userId,
    staleTime: 1000 * 60 * 5,
  });
};
