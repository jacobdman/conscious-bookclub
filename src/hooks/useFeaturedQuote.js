import { useQuery } from '@tanstack/react-query';
// Services
import { getFeaturedQuote } from 'services/quotes/quotes.service';

const STALE_TIME_MS = 1000 * 60 * 5;

export const useFeaturedQuote = (userId, clubId) => {
  return useQuery({
    queryKey: ['featured', 'quote', userId, clubId],
    queryFn: () => getFeaturedQuote(userId, clubId),
    enabled: !!userId && !!clubId,
    staleTime: STALE_TIME_MS,
    refetchOnMount: false,
  });
};
