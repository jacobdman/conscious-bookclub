import { useQuery } from '@tanstack/react-query';
// Services
import { getPosts } from 'services/posts/posts.service';
import { getReadStatus } from 'services/feed/feed.service';

const STALE_TIME_MS = 1000 * 60 * 5; // 5 min - avoid refetch when navigating back to dashboard

const fetchFeedInitial = async (clubId, userId, options = {}) => {
  const { limit = 25, includeActivity = true } = options;
  const [postsResponse, readStatusData] = await Promise.all([
    getPosts(clubId, { limit, includeActivity }),
    getReadStatus(clubId, userId).catch(() => ({ lastReadAt: null })),
  ]);
  const postsData = Array.isArray(postsResponse) ? postsResponse : (postsResponse?.posts || []);
  const hasMore = Array.isArray(postsResponse) ? false : (postsResponse?.hasMore ?? false);
  const nextBeforeId = Array.isArray(postsResponse) ? null : (postsResponse?.nextBeforeId ?? null);
  return {
    posts: Array.isArray(postsData) ? postsData : [],
    hasMore,
    nextBeforeId,
    readStatus: readStatusData,
  };
};

export const useFeedInitial = (clubId, userId, options = {}) => {
  return useQuery({
    queryKey: ['feed', clubId, userId, options?.includeActivity ?? true],
    queryFn: () => fetchFeedInitial(clubId, userId, options),
    enabled: !!clubId && !!userId,
    staleTime: STALE_TIME_MS,
    refetchOnMount: false,
  });
};
