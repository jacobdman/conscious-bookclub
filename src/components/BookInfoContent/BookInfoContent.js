import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { Box, Typography, Avatar, Chip, Divider, IconButton, Tooltip, Button } from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbUpOffAlt as ThumbUpOffAltIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import BookProgressControls from 'components/BookProgressControls';
import { setOpenLibraryCoverSize, OL_COVER_SIZE } from 'services/openLibraryService';
import { bookCoverAvatarSx } from 'utils/bookCoverDisplay';

const LINE_CLAMP = 3;

/** First N names shown before "Show more" (discover interaction lists). */
const INTERACTION_NAME_PREVIEW = 3;

const formatSuggestedAt = (book) => {
  const raw = book.createdAt ?? book.created_at;
  if (raw == null || raw === '') return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export const ClampedTextBlock = ({ sectionKey, title, text, emptyLabel }) => {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    setExpanded(false);
    setShowToggle(false);
  }, [sectionKey]);

  const displayText = text?.trim() ? text.trim() : null;
  const body = displayText || emptyLabel;

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) {
      setShowToggle(false);
      return;
    }
    if (expanded) {
      setShowToggle(true);
      return;
    }
    const id = requestAnimationFrame(() => {
      const node = contentRef.current;
      if (!node) return;
      setShowToggle(node.scrollHeight > node.clientHeight + 2);
    });
    return () => cancelAnimationFrame(id);
  }, [body, expanded, sectionKey]);

  return (
    <Box sx={{ mb: 2, '&:last-of-type': { mb: 0 } }}>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Typography
        ref={contentRef}
        component="div"
        variant="body2"
        color="text.secondary"
        sx={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...(!expanded && {
            display: '-webkit-box',
            WebkitLineClamp: LINE_CLAMP,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }),
        }}
      >
        {body}
      </Typography>
      {displayText && showToggle && (
        <Button
          type="button"
          variant="text"
          size="small"
          onClick={() => setExpanded((v) => !v)}
          sx={{ mt: 0.5, p: 0, minWidth: 0, textTransform: 'none' }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      )}
    </Box>
  );
};

/**
 * Shared book detail body: cover, themes, meta, optional like control, description & notes, optional progress.
 * Used by BookInfoDialog and SwipeCard (details face).
 */
const BookInfoContent = ({
  book,
  discussionDate,
  onToggleLike,
  isLikeLoading,
  saveBookProgress,
  onBookProgressUpdated,
  /** Omit My Progress (e.g. swipe review). */
  showProgress = true,
  /** When false, show read-only vote counts (and super-likes when present). */
  showLikeToggle = true,
  /** Super-like control (discover interaction). Omit on swipe/details-only views. */
  onSuperLikeClick,
  isSuperLikeLoading = false,
  sx,
}) => {
  const { user } = useAuth();
  const [likesMembersExpanded, setLikesMembersExpanded] = useState(false);
  const [superLikesMembersExpanded, setSuperLikesMembersExpanded] = useState(false);

  useEffect(() => {
    setLikesMembersExpanded(false);
    setSuperLikesMembersExpanded(false);
  }, [book?.id]);

  if (!book) return null;

  const themes = Array.isArray(book.theme) ? book.theme : book.theme ? [book.theme] : [];
  const description = book.description?.trim();
  const suggesterNotes = (book.suggesterNotes ?? book.suggester_notes ?? '').trim();
  const hasProgress = Boolean(book.chosenForBookclub);
  const likesCount = book.likesCount || 0;
  const superLikesCount = book.superLikesCount ?? 0;
  const isLiked = Boolean(book.isLiked);
  const isSuperLiked = Boolean(book.isSuperLiked);
  /** New super likes only apply to suggested-pool books; backlog titles may still show an existing super like for removal. */
  const cannotAddSuperLike =
    book.pool === 'backlog' && !isSuperLiked;
  const uploadedBy = book.uploader?.displayName || book.uploadedBy || book.uploaded_by;

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString();
  };

  const getStatusLabel = () => {
    if (!hasProgress) return 'Not selected for reading';
    const progressStatus = book.progress?.status || 'not_started';
    if (progressStatus === 'finished') return 'Finished';
    if (progressStatus === 'reading') return 'Reading';
    return 'Not Started';
  };

  const likeUsers = Array.isArray(book.likeUsers) ? book.likeUsers : [];
  const superLikeUsers = Array.isArray(book.superLikeUsers) ? book.superLikeUsers : [];
  const likeUsersTruncated = Boolean(book.likeUsersTruncated);
  const superLikeUsersTruncated = Boolean(book.superLikeUsersTruncated);

  const formatInteractionNamesLine = (users, expanded, apiTruncated) => {
    if (!users.length) {
      return { text: '—' };
    }
    const visible = expanded ? users : users.slice(0, INTERACTION_NAME_PREVIEW);
    const names = visible.map((u) => u.displayName || 'Unknown').join(', ');
    const tail = expanded && apiTruncated ? ' (+ more)' : '';
    return { text: `${names}${tail}` };
  };

  const interactionListHasMore = (users, apiTruncated) =>
    users.length > 0 &&
    (users.length > INTERACTION_NAME_PREVIEW || apiTruncated);

  const likeLine = formatInteractionNamesLine(likeUsers, likesMembersExpanded, likeUsersTruncated);
  const superLikeLine = formatInteractionNamesLine(
    superLikeUsers,
    superLikesMembersExpanded,
    superLikeUsersTruncated,
  );
  const showLikeMembersToggle = interactionListHasMore(likeUsers, likeUsersTruncated);
  const showSuperLikeMembersToggle = interactionListHasMore(superLikeUsers, superLikeUsersTruncated);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%', ...sx }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Avatar
          src={
            book.coverImage ? setOpenLibraryCoverSize(book.coverImage, OL_COVER_SIZE.L) : undefined
          }
          alt={book.title}
          variant="rounded"
          sx={bookCoverAvatarSx({
            width: 100,
            height: 140,
            borderRadius: 2,
            boxShadow: 2,
          })}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {themes.length > 0 ? (
              themes.map((theme) => (
                <Chip key={theme} label={theme} size="small" color="primary" />
              ))
            ) : (
              <Chip label="No theme" size="small" variant="outlined" />
            )}
            <Chip label={book.genre || 'No genre'} size="small" variant="outlined" />
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Discussion date: {formatDate(discussionDate)}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Suggested by: {uploadedBy || 'Unknown'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Suggested at: {formatSuggestedAt(book) ?? '—'}
          </Typography>
          {showLikeToggle ? (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Tooltip title={isLiked ? 'Unlike book' : 'Like book'}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={(event) => onToggleLike?.(event, book)}
                      disabled={isLikeLoading || !onToggleLike}
                      color={isLiked ? 'primary' : 'default'}
                      aria-label={isLiked ? 'Unlike book' : 'Like book'}
                    >
                      {isLiked ? <ThumbUpIcon fontSize="small" /> : <ThumbUpOffAltIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ pt: 0.5 }}>
                  {likesCount} {likesCount === 1 ? 'like' : 'likes'}
                </Typography>
              </Box>
              {onSuperLikeClick ? (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1 }}>
                  <Tooltip
                    title={
                      cannotAddSuperLike
                        ? 'Super likes are only for books not yet in the backlog'
                        : isSuperLiked
                          ? 'Remove super like'
                          : 'Super like this book'
                    }
                  >
                    <span>
                      <IconButton
                        size="small"
                        onClick={(event) => onSuperLikeClick(event, book)}
                        disabled={isSuperLikeLoading || cannotAddSuperLike}
                        color={isSuperLiked ? 'error' : 'default'}
                        aria-label={isSuperLiked ? 'Remove super like' : 'Super like book'}
                      >
                        {isSuperLiked ? (
                          <FavoriteIcon fontSize="small" />
                        ) : (
                          <FavoriteBorderIcon fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ pt: 0.5 }}>
                    {superLikesCount} {superLikesCount === 1 ? 'super like' : 'super likes'}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, ml: 0.5 }}>
                  {superLikesCount} {superLikesCount === 1 ? 'super like' : 'super likes'}
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {likesCount} {likesCount === 1 ? 'like' : 'likes'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                {superLikesCount} {superLikesCount === 1 ? 'super like' : 'super likes'}
              </Typography>
            </Box>
          )}
          <Box sx={{ mt: 1.5 }} aria-label="Discover swipe likes">
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
              Liked by
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mt: 0.35, wordBreak: 'break-word' }}
            >
              {likeLine.text}
            </Typography>
            {showLikeMembersToggle ? (
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={() => setLikesMembersExpanded((v) => !v)}
                sx={{ mt: 0.25, p: 0, minWidth: 0, textTransform: 'none', display: 'block' }}
              >
                {likesMembersExpanded ? 'Show less' : 'Show more'}
              </Button>
            ) : null}
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ fontWeight: 600, mt: 1 }}
            >
              Super liked by
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mt: 0.35, wordBreak: 'break-word' }}
            >
              {superLikeLine.text}
            </Typography>
            {showSuperLikeMembersToggle ? (
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={() => setSuperLikesMembersExpanded((v) => !v)}
                sx={{ mt: 0.25, p: 0, minWidth: 0, textTransform: 'none', display: 'block' }}
              >
                {superLikesMembersExpanded ? 'Show less' : 'Show more'}
              </Button>
            ) : null}
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        About this book
      </Typography>
      <Box sx={{ mb: 1 }}>
        <ClampedTextBlock
          sectionKey={`${book.id}-desc`}
          title="Description"
          text={description}
          emptyLabel="No description available."
        />
        <ClampedTextBlock
          sectionKey={`${book.id}-notes`}
          title="Suggester's notes"
          text={suggesterNotes}
          emptyLabel="None"
        />
      </Box>

      {showProgress ? (
        <>
          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            My Progress
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {getStatusLabel()}
          </Typography>
          <BookProgressControls
            user={user}
            bookId={book.id}
            chosenForBookclub={book.chosenForBookclub}
            initialProgress={book.progress}
            saveProgress={saveBookProgress}
            onProgressUpdated={onBookProgressUpdated}
            showStatusLine={false}
          />
        </>
      ) : null}
    </Box>
  );
};

export default BookInfoContent;
