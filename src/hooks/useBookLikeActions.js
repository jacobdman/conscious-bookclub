import { useState, useCallback } from 'react';
import { useAuth } from 'AuthContext';
import useBooksContext from 'contexts/Books';

/**
 * Shared like / super-like handlers for book rows and BookInfoDialog.
 * Uses BooksContext toggles and per-book loading flags.
 */
const useBookLikeActions = () => {
  const { user } = useAuth();
  const { toggleBookLike, toggleBookSuperLike } = useBooksContext();
  const [loadingLikes, setLoadingLikes] = useState({});
  const [loadingSuperLikes, setLoadingSuperLikes] = useState({});

  const handleToggleLike = useCallback(
    async (event, book) => {
      if (event?.stopPropagation) {
        event.stopPropagation();
      }
      if (!user) return;

      setLoadingLikes((prev) => ({ ...prev, [book.id]: true }));
      try {
        await toggleBookLike(book.id, !book.isLiked);
      } catch {
        // Error handled in context
      } finally {
        setLoadingLikes((prev) => ({ ...prev, [book.id]: false }));
      }
    },
    [user, toggleBookLike],
  );

  const handleSuperLikeToggle = useCallback(
    async (bookId, shouldSuperLike) => {
      if (!user) return undefined;
      setLoadingSuperLikes((prev) => ({ ...prev, [bookId]: true }));
      try {
        return await toggleBookSuperLike(bookId, shouldSuperLike);
      } catch {
        return undefined;
      } finally {
        setLoadingSuperLikes((prev) => ({ ...prev, [bookId]: false }));
      }
    },
    [user, toggleBookSuperLike],
  );

  return {
    handleToggleLike,
    handleSuperLikeToggle,
    loadingLikes,
    loadingSuperLikes,
  };
};

export default useBookLikeActions;
