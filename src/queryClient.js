import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const isBrowser = typeof window !== 'undefined';

/** Bump when cache shape or app version makes old persisted data invalid. */
export const CACHE_VERSION = 1;

const PERSISTED_QUERY_PREFIXES = ['books', 'goals', 'meetings', 'feed', 'leaderboard', 'featured', 'subscription'];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** Persister only exists in browser; used by PersistQueryClientProvider. */
export const persister = isBrowser
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: `cbc-query-cache-v${CACHE_VERSION}`,
    })
  : undefined;

/** Options for persist provider: scope persisted queries and set max age. */
export const persistOptions = isBrowser
  ? {
      persister,
      maxAge: 1000 * 60 * 60 * 24,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          const key = query.queryKey?.[0];
          return typeof key === 'string' && PERSISTED_QUERY_PREFIXES.includes(key);
        },
      },
    }
  : undefined;
