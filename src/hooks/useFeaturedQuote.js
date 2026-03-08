import { useQuery } from '@tanstack/react-query';
// Services
import { getFeaturedQuote } from 'services/quotes/quotes.service';

export const useFeaturedQuote = (userId, clubId) => {
  return useQuery({
    queryKey: ['featured', 'quote', userId, clubId],
    queryFn: () => getFeaturedQuote(userId, clubId),
    enabled: !!userId && !!clubId,
  });
};
