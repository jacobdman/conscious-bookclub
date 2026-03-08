import { useQuery } from '@tanstack/react-query';
// Services
import { getLeaderboardReport } from 'services/reports/reports.service';

export const useLeaderboard = (clubId, userId, startDate, endDate) => {
  const startKey = startDate?.getTime?.() ?? startDate;
  const endKey = endDate?.getTime?.() ?? endDate;

  return useQuery({
    queryKey: ['leaderboard', clubId, userId, startKey, endKey],
    queryFn: () => getLeaderboardReport(clubId, userId, startDate, endDate),
    enabled: !!clubId && !!userId && !!startDate && !!endDate,
  });
};
