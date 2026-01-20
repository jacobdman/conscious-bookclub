import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  TextField,
  Tooltip,
  FormControlLabel,
  Checkbox,
  SwipeableDrawer,
  Divider,
  Button,
  Stack,
  Grid,
} from '@mui/material';
import { Reply as ReplyIcon } from '@mui/icons-material';
import ReplyQuote from 'components/ReplyQuote';
import EmojiInput from 'components/EmojiInput';
import useFeedContext from 'contexts/Feed';
import { EMOJI_CATEGORIES } from 'utils/emojiCategories';
import { triggerHaptic } from 'utils/haptics';
import { formatSemanticDateTime, formatLocalTime } from 'utils/dateHelpers';
import { formatMeetingDisplay } from 'utils/meetingTime';

const PostCard = ({ post, isFirstInGroup = true }) => {
  const { createReply, registerPostRef, addReaction } = useFeedContext();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplySpoiler, setIsReplySpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [fullPickerOpen, setFullPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const postRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressHandledRef = useRef(false);
  const pressMovedRef = useRef(false);

  useEffect(() => {
    if (postRef.current) {
      registerPostRef(post.id, postRef.current);
    }
    return () => {
      registerPostRef(post.id, null);
    };
  }, [post.id, registerPostRef]);

  const handleReplySubmit = async () => {
    if (!replyText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await createReply(post.id, { text: replyText.trim(), isSpoiler: isReplySpoiler });
      setReplyText('');
      setIsReplySpoiler(false);
      setShowReplyForm(false);
    } catch (err) {
      console.error('Error creating reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  }, []);

  const authorName = post.authorName || post.author?.displayName || 'Unknown';
  const isActivity = !!post.isActivity;
  const showAvatar = isFirstInGroup && !isActivity;
  const { displayString: timestampLabel } = formatSemanticDateTime(post.created_at);
  const quickEmojis =
    (post.reactions || [])
      .map(r => r.emoji)
      .filter((emoji, index, arr) => arr.indexOf(emoji) === index)
      .slice(0, 6) || [];
  const quickEmojiChoices = quickEmojis.length > 0 ? quickEmojis : ['👍', '❤️', '😂', '🎉', '👏', '🔥'];

  const openActions = () => {
    triggerHaptic('medium');
    setActionsOpen(true);
  };

  const closeActions = () => {
    setFullPickerOpen(false);
    setActionsOpen(false);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e) => {
    if (e.pointerType !== 'touch') return;
    if (e.target.closest('[data-emoji-reaction]')) return;
    pressMovedRef.current = false;
    longPressHandledRef.current = false;
    cancelLongPress();
    longPressTimerRef.current = setTimeout(() => {
      longPressHandledRef.current = true;
      openActions();
    }, 600);
  };

  const handlePointerMove = (e) => {
    if (e.pointerType !== 'touch') return;
    if (!longPressTimerRef.current) return;
    // Cancel if user starts scrolling/dragging
    if (Math.abs(e.movementX) > 6 || Math.abs(e.movementY) > 6) {
      pressMovedRef.current = true;
      cancelLongPress();
    }
  };

  const handlePointerUp = (e) => {
    if (e.pointerType !== 'touch') return;
    cancelLongPress();
    setTimeout(() => {
      longPressHandledRef.current = false;
    }, 50);
  };

  const handlePointerCancel = () => {
    cancelLongPress();
    longPressHandledRef.current = false;
  };

  const handlePostClick = (e) => {
    if (longPressHandledRef.current) {
      return;
    }
    // On mobile/touch devices, toggle reactions on tap
    // Only toggle if clicking on the message itself, not on reactions
    if ('ontouchstart' in window && !e.target.closest('[data-emoji-reaction]')) {
      setShowReactions(prev => !prev);
    }
  };

  const handleQuickEmoji = async (emoji) => {
    try {
      await addReaction(post.id, emoji);
      triggerHaptic('light');
      closeActions();
    } catch (err) {
      console.error('Error adding reaction from sheet:', err);
    }
  };

  const postImages = Array.isArray(post.images) ? post.images.filter(Boolean) : [];
  const showImages = postImages.length > 0 && (!post.isSpoiler || isRevealed);

  const relatedRecord = post.relatedRecord || null;
  const isMeetingActivity = post.text?.includes('{meeting_post}') && relatedRecord?.type === 'meeting';
  const isBookCompletionActivity = post.text?.includes('{book_completion_post}') && relatedRecord?.type === 'book';
  const isGoalCompletionActivity = post.text?.includes('{goal_completion_post}') && relatedRecord?.type === 'goal';

  const renderMeetingActivity = () => {
    const meetingData = relatedRecord?.record || {};

    const meetingTitle = meetingData.title || 'Book Club Meeting';
    const location = meetingData.location;
    const details = meetingData.notes;
    const meetingBook = meetingData.book;
    const display = formatMeetingDisplay({
      date: meetingData.date,
      startTime: meetingData.startTime,
      timezone: meetingData.timezone,
    });
    const actionLabel = 'Meeting';
    const showViewerTime =
      display.viewerTime &&
      (display.viewerDate !== display.hostDate || display.viewerTime !== display.hostTime);

    return (
      <Box
        sx={{
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 1.5,
          mb: 0.5,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
          {actionLabel}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.25 }}>
          {meetingTitle}
        </Typography>
        {(display.hostDate || display.hostTime) && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
            📅 {display.hostDate}{display.hostTime ? ` · ${display.hostTime}` : ''}{display.hostLabel ? ` (${display.hostLabel})` : ''}
          </Typography>
        )}
        {showViewerTime && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
            Your time: {display.viewerDate} · {display.viewerTime}
          </Typography>
        )}
        {location && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
            📍 {location}
          </Typography>
        )}
        {meetingBook && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
            📚 {meetingBook.title}
            {meetingBook.author ? ` by ${meetingBook.author}` : ''}
          </Typography>
        )}
        {details && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            {details}
          </Typography>
        )}
      </Box>
    );
  };

  const renderBookCompletionActivity = () => {
    const bookData = relatedRecord?.record || {};
    const actorName = post.authorName || 'A reader';

    const title = bookData.title || 'a book';
    const author = bookData.author;
    const coverImage = bookData.coverImage;

    return (
      <Box
        sx={{
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 1.5,
          mb: 0.5,
          display: 'flex',
          gap: 1.25,
        }}
      >
        {coverImage && (
          <Box
            component="img"
            src={coverImage}
            alt={title}
            sx={{
              width: 56,
              height: 80,
              objectFit: 'cover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
            {actorName} finished a book
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {title}
            {author ? ` by ${author}` : ''}
          </Typography>
        </Box>
      </Box>
    );
  };

  const renderGoalCompletionActivity = () => {
    const goalData = relatedRecord?.record || {};
    const actorName = post.authorName || 'A member';
    const goalTitle = goalData.title || 'a goal';
    const goalType = goalData.type ? goalData.type.replace('_', ' ') : 'goal';
    const cadenceLabel = goalData.cadence ? `${goalData.cadence} ${goalType}` : goalType;
    let targetLabel = null;
    if (goalData.type === 'habit' && goalData.targetCount) {
      targetLabel = `${goalData.targetCount} times`;
    } else if (goalData.type === 'metric' && goalData.targetQuantity) {
      targetLabel = `${goalData.targetQuantity} ${goalData.unit || ''}`.trim();
    }

    return (
      <Box
        sx={{
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 1.5,
          mb: 0.5,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
          🎉 {actorName} completed a goal
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {goalTitle}
        </Typography>
        {cadenceLabel && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {cadenceLabel}
            {targetLabel ? ` · ${targetLabel}` : ''}
          </Typography>
        )}
        <Box sx={{ mt: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              handleQuickEmoji('🎉');
            }}
            sx={{ textTransform: 'none' }}
          >
            Celebrate
          </Button>
        </Box>
      </Box>
    );
  };

  const renderFullEmojiPicker = () => {
    const emojis = EMOJI_CATEGORIES[activeCategory] || [];
    return (
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Button
              key={category}
              size="small"
              variant={category === activeCategory ? 'contained' : 'text'}
              onClick={() => setActiveCategory(category)}
              sx={{ textTransform: 'none' }}
            >
              {category}
            </Button>
          ))}
        </Stack>
        <Grid container spacing={1}>
          {emojis.map((emoji) => (
            <Grid item xs={2} key={emoji}>
              <Button
                fullWidth
                onClick={() => handleQuickEmoji(emoji)}
                sx={{ minWidth: 'auto', fontSize: '1.25rem', py: 1 }}
              >
                {emoji}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  return (
    <Box
      ref={postRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerMove={handlePointerMove}
      onMouseEnter={() => {
        setHovered(true);
        setShowReactions(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
        // Always hide reactions on mouse leave (desktop behavior)
        setShowReactions(false);
      }}
      onClick={handlePostClick}
      sx={{
        display: 'flex',
        gap: 1.5,
        px: 2,
        py: 0.75,
        backgroundColor: isActivity ? 'action.selected' : 'transparent',
        borderRadius: 2,
        border: isActivity ? '1px solid' : 'none',
        borderColor: isActivity ? 'divider' : 'transparent',
        '&:hover': {
          backgroundColor: isActivity ? 'action.selected' : 'action.hover',
        },
        transition: 'background-color 0.2s',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: 'manipulation',
      }}
    >
      {/* Avatar - only show for first message in group */}
      <Box sx={{ flexShrink: 0, width: 40, display: 'flex', justifyContent: 'center' }}>
        {showAvatar ? (
          <Avatar
            src={post.author?.photoUrl}
            alt={authorName}
            sx={{ width: 40, height: 40 }}
          />
        ) : (
          <Box sx={{ width: 40 }} />
        )}
      </Box>

      {/* Message Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Header with name and timestamp - only show for first in group */}
        {isActivity ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box
              sx={{
                backgroundColor: 'primary.main',
                px: 1,
                py: 0.25,
                borderRadius: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'primary.contrastText',
                  fontSize: '0.6875rem',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Activity
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.75rem',
              }}
            >
              {timestampLabel}
            </Typography>
          </Box>
        ) : showAvatar && (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: 'text.primary',
              }}
            >
              {authorName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.75rem',
              }}
            >
              {timestampLabel}
            </Typography>
          </Box>
        )}

        {/* Reply Quote */}
        {post.parentPostId && post.parentPost && (
          <Box sx={{ mb: 0.75 }}>
            <ReplyQuote
              parentPostText={post.parentPost.text}
              parentPostId={post.parentPostId}
              parentAuthorName={post.parentPost.authorName || post.parentPost.author?.displayName || 'Unknown'}
              parentIsSpoiler={post.parentIsSpoiler}
            />
          </Box>
        )}

        {/* Message Text */}
        {isMeetingActivity ? (
          renderMeetingActivity()
        ) : isBookCompletionActivity ? (
          renderBookCompletionActivity()
        ) : isGoalCompletionActivity ? (
          renderGoalCompletionActivity()
        ) : post.isSpoiler && !isRevealed ? (
          <Box
            onClick={() => {
              setIsFadingOut(true);
              setTimeout(() => {
                setIsRevealed(true);
                setIsFadingOut(false);
              }, 300);
            }}
            sx={{
              cursor: 'pointer',
              mb: 0.5,
              userSelect: 'none',
              backgroundColor: 'action.hover',
              borderRadius: 1.5,
              px: 2,
              py: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.3s ease',
              opacity: isFadingOut ? 0 : 1,
              transform: isFadingOut ? 'scale(0.98)' : 'scale(1)',
              pointerEvents: isFadingOut ? 'none' : 'auto',
              '&:hover': {
                backgroundColor: 'action.selected',
                borderColor: 'primary.main',
              },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                textAlign: 'center',
                mb: 0.5,
              }}
            >
              Spoiler
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
                display: 'block',
                fontSize: '0.75rem',
              }}
            >
              Click to reveal
            </Typography>
          </Box>
        ) : (
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '0.9375rem',
              lineHeight: 1.4,
              color: 'text.primary',
              fontWeight: isActivity ? 600 : 400,
              mb: 0.5,
            }}
          >
            {post.text}
          </Typography>
        )}

        {showImages && (
          <Box sx={{ mt: 0.75 }}>
            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: postImages.length === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
              }}
            >
              {postImages.map((url, index) => (
                <Box
                  key={`${url}-${index}`}
                  component="img"
                  src={url}
                  alt={`Post image ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    maxHeight: postImages.length === 1 ? 340 : 200,
                    aspectRatio: postImages.length === 1 ? '4 / 3' : '1 / 1',
                    objectFit: 'cover',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.default',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Reactions - always show existing reactions, only show + button on hover/tap */}
        <Box 
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          data-emoji-reaction
        >
          <EmojiInput 
            postId={post.id} 
            reactions={post.reactions || []} 
            showAddButton={showReactions}
          />
          {hovered && (
            <Tooltip title="Reply">
              <IconButton
                size="small"
                onClick={() => setShowReplyForm(!showReplyForm)}
                sx={{
                  opacity: 0.7,
                  '&:hover': { opacity: 1 },
                  padding: '4px',
                }}
              >
                <ReplyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Reply Form */}
        {showReplyForm && (
          <Box sx={{ mt: 1.5, ml: -1, pl: 1, borderLeft: '2px solid', borderColor: 'primary.main' }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder={`Reply to ${authorName}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleReplySubmit();
                }
              }}
              size="small"
              autoFocus
              sx={{
                mb: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.default',
                  borderRadius: 2,
                  userSelect: 'text',
                },
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isReplySpoiler}
                  onChange={(e) => setIsReplySpoiler(e.target.checked)}
                  size="small"
                />
              }
              label="Mark as spoiler"
              sx={{ mb: 1, ml: 0.5 }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <Typography
                variant="caption"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyText('');
                  setIsReplySpoiler(false);
                }}
                sx={{
                  cursor: 'pointer',
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                Cancel
              </Typography>
              <IconButton
                size="small"
                color="primary"
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || isSubmitting}
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '&:disabled': {
                    backgroundColor: 'action.disabledBackground',
                  },
                }}
              >
                <ReplyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        )}
      </Box>
      <SwipeableDrawer
        anchor="bottom"
        open={actionsOpen}
        onClose={closeActions}
        onOpen={() => {}}
        PaperProps={{
          sx: { borderTopLeftRadius: 12, borderTopRightRadius: 12, pb: 2 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="center" sx={{ mb: 1 }}>
            <Box sx={{ width: 40, height: 4, backgroundColor: 'divider', borderRadius: 2 }} />
          </Stack>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
            Quick reactions
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
            {quickEmojiChoices.map((emoji) => (
              <Button
                key={emoji}
                variant="outlined"
                onClick={() => handleQuickEmoji(emoji)}
                sx={{ minWidth: 48, minHeight: 40, fontSize: '1.2rem' }}
              >
                {emoji}
              </Button>
            ))}
          </Stack>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => {
              triggerHaptic('light');
              setFullPickerOpen(true);
            }}
            sx={{ textTransform: 'none', mb: 1 }}
          >
            Choose from full list
          </Button>
          <Divider sx={{ my: 1 }} />
          <Button
            fullWidth
            startIcon={<ReplyIcon />}
            onClick={() => {
              setShowReplyForm(true);
              closeActions();
            }}
            sx={{ textTransform: 'none' }}
          >
            Reply to {authorName}
          </Button>
        </Box>
        {fullPickerOpen && renderFullEmojiPicker()}
      </SwipeableDrawer>
    </Box>
  );
};

export default PostCard;

