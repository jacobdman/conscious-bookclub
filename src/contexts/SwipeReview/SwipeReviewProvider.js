import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SwipeReviewContext from './SwipeReviewContext';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import {
  getSwipeQueue,
  recordInteraction,
  removeInteraction,
} from 'services/books/discover.service';

const PAGE_SIZE = 25;
const PREFETCH_AT = 5;
const PHASE_ORDER = ['discover', 'bookmarked', 'backlog_review'];

const nextPhase = (p) => {
  const i = PHASE_ORDER.indexOf(p);
  return i >= 0 && i < PHASE_ORDER.length - 1 ? PHASE_ORDER[i + 1] : null;
};

/**
 * Append books and tag swipe UI phase; skip duplicate ids (keep first occurrence).
 * @param {object[]} prev
 * @param {object[]} additions
 * @param {string} swipePhase
 */
const mergeDedupe = (prev, additions, swipePhase) => {
  const seen = new Set(prev.map((b) => b.id));
  const out = [...prev];
  for (const b of additions) {
    if (!seen.has(b.id)) {
      seen.add(b.id);
      out.push({ ...b, _swipePhase: swipePhase });
    }
  }
  return out;
};

const SwipeReviewProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const navigate = useNavigate();

  const [queue, setQueue] = useState([]);
  const [activeQueue, setActiveQueue] = useState('discover');
  const [remainingSuperLikes, setRemainingSuperLikes] = useState(0);
  const [promotionThreshold, setPromotionThreshold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clubId = currentClub?.id;
  const userId = user?.uid;

  const activeQueueRef = useRef(activeQueue);
  activeQueueRef.current = activeQueue;

  /** Cursor for paginated Discover session (discover → bookmarked → backlog_review). */
  const discoverFetchRef = useRef({
    phase: 'discover',
    hasMore: true,
    nextAfter: null,
  });
  const prefetchInFlightRef = useRef(false);
  const loadGenRef = useRef(0);

  const isBacklogReviewForBook = useCallback(
    (book) => {
      if (!book) return false;
      if (activeQueue === 'backlog_review') return true;
      if (activeQueue === 'discover') return book._swipePhase === 'backlog_review';
      return false;
    },
    [activeQueue],
  );

  const isBacklogReview = useMemo(
    () => isBacklogReviewForBook(queue[0]),
    [isBacklogReviewForBook, queue],
  );

  const applyDiscoverMeta = useCallback((data) => {
    setRemainingSuperLikes(data.remainingSuperLikes ?? 0);
    setPromotionThreshold(data.promotionThreshold ?? 0);
  }, []);

  const loadSimpleQueue = useCallback(
    async (queueName) => {
      if (!clubId || !userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getSwipeQueue(clubId, userId, queueName, PAGE_SIZE);
        applyDiscoverMeta(data);
        const raw = data.books || [];
        const tagged = raw.map((b) => ({ ...b, _swipePhase: queueName }));
        setQueue(tagged);
      } catch (e) {
        setError(e.message || 'Failed to load books');
        setQueue([]);
      } finally {
        setLoading(false);
      }
    },
    [clubId, userId, applyDiscoverMeta],
  );

  /**
   * Scan forward from `startPhase` until a non-empty page is found or phases end.
   * Paginates within a phase when the API returns empty rows but `hasMore` is true.
   * @param {string} startPhase
   * @param {number} gen
   */
  const scanPhasesForBooks = useCallback(
    async (startPhase, gen) => {
      let phase = startPhase;
      while (phase) {
        let afterId = null;
        for (;;) {
          const data = await getSwipeQueue(clubId, userId, phase, PAGE_SIZE, afterId);
          if (gen !== loadGenRef.current) return null;
          applyDiscoverMeta(data);
          const books = data.books || [];
          if (books.length > 0) {
            discoverFetchRef.current = {
              phase,
              hasMore: !!data.hasMore,
              nextAfter: data.hasMore ? books[books.length - 1].id : null,
            };
            return { phase, books };
          }
          if (!data.hasMore) break;
          afterId = data.nextCursor?.afterBookId;
          if (!afterId) break;
        }
        phase = nextPhase(phase);
        discoverFetchRef.current = {
          phase: phase || 'discover',
          hasMore: true,
          nextAfter: null,
        };
      }
      return null;
    },
    [clubId, userId, applyDiscoverMeta],
  );

  const loadDiscoverSession = useCallback(async () => {
    if (!clubId || !userId) {
      setLoading(false);
      return;
    }
    loadGenRef.current += 1;
    const gen = loadGenRef.current;
    setLoading(true);
    setError(null);
    discoverFetchRef.current = { phase: 'discover', hasMore: true, nextAfter: null };
    setQueue([]);

    try {
      const first = await scanPhasesForBooks('discover', gen);
      if (gen !== loadGenRef.current) return;
      if (first) {
        setQueue(mergeDedupe([], first.books, first.phase));
      } else {
        setQueue([]);
      }
    } catch (e) {
      if (gen !== loadGenRef.current) return;
      setError(e.message || 'Failed to load books');
      setQueue([]);
    } finally {
      if (gen === loadGenRef.current) {
        setLoading(false);
      }
    }
  }, [clubId, userId, scanPhasesForBooks]);

  React.useEffect(() => {
    if (!clubId || !userId) {
      setLoading(false);
      return;
    }
    if (activeQueue === 'discover') {
      loadDiscoverSession();
    } else {
      loadSimpleQueue(activeQueue);
    }
  }, [clubId, userId, activeQueue, loadDiscoverSession, loadSimpleQueue]);

  /** Prefetch next page for the current phase, or advance phase when the buffer runs low. */
  React.useEffect(() => {
    if (activeQueue !== 'discover' || !clubId || !userId) return;
    if (loading) return;
    if (queue.length > PREFETCH_AT) return;

    let cancelled = false;

    const run = async () => {
      if (prefetchInFlightRef.current) return;
      prefetchInFlightRef.current = true;
      const genAtStart = loadGenRef.current;
      try {
        const s = discoverFetchRef.current;

        if (s.hasMore && s.nextAfter != null) {
          const data = await getSwipeQueue(clubId, userId, s.phase, PAGE_SIZE, s.nextAfter);
          if (cancelled || activeQueueRef.current !== 'discover' || genAtStart !== loadGenRef.current) return;
          applyDiscoverMeta(data);
          const books = data.books || [];
          setQueue((prev) => mergeDedupe(prev, books, s.phase));
          discoverFetchRef.current = {
            phase: s.phase,
            hasMore: !!data.hasMore,
            nextAfter: data.hasMore && books.length ? books[books.length - 1].id : null,
          };
          return;
        }

        if (!s.hasMore) {
          const np = nextPhase(s.phase);
          if (!np) return;
          const filled = await scanPhasesForBooks(np, genAtStart);
          if (cancelled || activeQueueRef.current !== 'discover' || genAtStart !== loadGenRef.current) return;
          if (filled && filled.books.length) {
            setQueue((prev) => mergeDedupe(prev, filled.books, filled.phase));
          }
        }
      } catch (e) {
        if (!cancelled && activeQueueRef.current === 'discover') {
          setError(e.message || 'Failed to load more');
        }
      } finally {
        prefetchInFlightRef.current = false;
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [queue.length, activeQueue, loading, clubId, userId, scanPhasesForBooks, applyDiscoverMeta]);

  const refreshQueue = useCallback(async () => {
    if (activeQueue === 'discover') {
      await loadDiscoverSession();
    } else {
      await loadSimpleQueue(activeQueue);
    }
  }, [activeQueue, loadDiscoverSession, loadSimpleQueue]);

  const skipCurrent = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const submitAction = useCallback(
    async (bookId, action) => {
      if (!clubId || !userId) return;
      try {
        const result = await recordInteraction(clubId, bookId, userId, action);
        setQueue((prev) => prev.filter((b) => b.id !== bookId));
        if (result.remainingSuperLikes != null) {
          setRemainingSuperLikes(result.remainingSuperLikes);
        }
        return result;
      } catch (e) {
        setError(e.message);
        throw e;
      }
    },
    [clubId, userId],
  );

  const removeSuperLike = useCallback(
    async (bookId) => {
      if (!clubId || !userId) return;
      const result = await removeInteraction(clubId, bookId, userId, 'super_like');
      if (result.remainingSuperLikes != null) {
        setRemainingSuperLikes(result.remainingSuperLikes);
      }
      return result;
    },
    [clubId, userId],
  );

  const close = useCallback(() => {
    navigate('/books');
  }, [navigate]);

  const value = useMemo(
    () => ({
      queue,
      activeQueue,
      setActiveQueue,
      remainingSuperLikes,
      promotionThreshold,
      loading,
      error,
      isBacklogReview,
      isBacklogReviewForBook,
      refreshQueue,
      skipCurrent,
      submitAction,
      removeSuperLike,
      close,
    }),
    [
      queue,
      activeQueue,
      remainingSuperLikes,
      promotionThreshold,
      loading,
      error,
      isBacklogReview,
      isBacklogReviewForBook,
      refreshQueue,
      skipCurrent,
      submitAction,
      removeSuperLike,
      close,
    ],
  );

  return (
    <SwipeReviewContext.Provider value={value}>{children}</SwipeReviewContext.Provider>
  );
};

export default SwipeReviewProvider;
