import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
  SwipeableDrawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Button,
  Stack,
  Grid,
} from '@mui/material';
import {
  Reply as ReplyIcon,
  AlternateEmail,
  MoreHoriz,
  EditOutlined,
  DeleteOutline,
} from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import ProfileAvatar from 'components/ProfileAvatar';
import ReplyQuote from 'components/ReplyQuote';
import EmojiInput from 'components/EmojiInput';
import MentionInput from 'components/MentionInput';
import useFeedContext from 'contexts/Feed';
import { EMOJI_CATEGORIES } from 'utils/emojiCategories';
import { triggerHaptic } from 'utils/haptics';
import { formatSemanticDateTime } from 'utils/dateHelpers';
import { formatMeetingDisplay } from 'utils/meetingTime';
import { renderMentions, encodeMentions, MENTION_REGEX } from 'utils/mentionHelpers';

const PostCard = ({ post, isFirstInGroup = true }) => {
  const { user } = useAuth();
  const { createReply, registerPostRef, addReaction, updatePost, deletePost } = useFeedContext();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplySpoiler, setIsReplySpoiler] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isEditSpoiler, setIsEditSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [fullPickerOpen, setFullPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [replyMentions, setReplyMentions] = useState([]); // Track mentions in reply
  const [editMentions, setEditMentions] = useState([]); // Track mentions in edit
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const postRef = useRef(null);
  const replyInputRef = useRef(null);
  const editInputRef = useRef(null);
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
      // Encode mentions in the reply text
      const textWithMentions = encodeMentions(replyText.trim(), replyMentions);
      await createReply(post.id, { text: textWithMentions, isSpoiler: isReplySpoiler });
      setReplyText('');
      setIsReplySpoiler(false);
      setReplyMentions([]);
      setShowReplyForm(false);
    } catch (err) {
      console.error('Error creating reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyMentionsChange = useCallback((newMentions) => {
    setReplyMentions(newMentions);
  }, []);

  const handleEditMentionsChange = useCallback((newMentions) => {
    setEditMentions(newMentions);
  }, []);

  const handleInsertReplyMention = () => {
    if (!replyInputRef.current) return;
    
    const input = replyInputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const textBefore = replyText.slice(0, start);
    const textAfter = replyText.slice(end);
    
    // Insert @ at cursor position
    const newText = textBefore + '@' + textAfter;
    setReplyText(newText);
    
    // Focus and set cursor after @
    setTimeout(() => {
      if (input) {
        const newCursorPos = start + 1;
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.focus();
        
        // Trigger input event to activate mention dropdown
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      }
    }, 0);
  };

  const handleInsertEditMention = () => {
    if (!editInputRef.current) return;

    const input = editInputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const textBefore = editText.slice(0, start);
    const textAfter = editText.slice(end);

    const newText = textBefore + '@' + textAfter;
    setEditText(newText);

    setTimeout(() => {
      if (input) {
        const newCursorPos = start + 1;
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.focus();

        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      }
    }, 0);
  };

  useEffect(() => () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  }, []);

  const authorName = post.authorName || post.author?.displayName || 'Unknown';
  const isActivity = !!post.isActivity;
  const isAuthor = user && (post.authorId === user.uid || post.author?.uid === user.uid);
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
  const streakMatch = post.text?.match(/\|streak:([^|]+)$/);
  const goalStreakValue = streakMatch?.[1]?.trim() || null;

  const renderMeetingActivity = () => {
    const meetingData = relatedRecord?.record || {};

    const meetingTitle = meetingData.title || 'Book Club Meeting';
    const location = meetingData.location;
    const details = meetingData.notes;
    const meetingBook = meetingData.book;
    const meetingTheme = meetingData.theme;
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
        {meetingTheme && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
            🎯 Theme: {meetingTheme}
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
        {goalStreakValue && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            🔥 Streak: {goalStreakValue}
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

  const decodeMentionsForEdit = (text = '') => {
    if (!text) return { displayText: '', mentions: [] };
    const regex = new RegExp(MENTION_REGEX);
    let displayText = '';
    const mentions = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      displayText += before;

      const displayName = match[1];
      const userId = match[2];
      const mentionText = `@${displayName}`;
      const start = displayText.length;
      displayText += mentionText;
      const end = displayText.length;

      mentions.push({ userId, displayName, start, end });
      lastIndex = match.index + match[0].length;
    }

    displayText += text.slice(lastIndex);
    return { displayText, mentions };
  };

  const rebuildMentionsForText = (text, mentions) => {
    if (!text || !mentions || mentions.length === 0) return [];
    const updatedMentions = [];
    const lastIndexByDisplayName = {};

    mentions.forEach((mention) => {
      const token = `@${mention.displayName}`;
      const searchStart = lastIndexByDisplayName[mention.displayName] ?? 0;
      const start = text.indexOf(token, searchStart);
      if (start !== -1) {
        const end = start + token.length;
        updatedMentions.push({
          ...mention,
          start,
          end,
        });
        lastIndexByDisplayName[mention.displayName] = end;
      }
    });

    return updatedMentions;
  };

  const handleStartEdit = () => {
    const { displayText, mentions } = decodeMentionsForEdit(post.text || '');
    setEditText(displayText);
    setEditMentions(mentions);
    setIsEditSpoiler(!!post.isSpoiler);
    setShowReplyForm(false);
    setIsEditing(true);
    closeActions();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText('');
    setEditMentions([]);
    setIsEditSpoiler(false);
  };

  const handleEditSubmit = async () => {
    if (!editText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const updatedMentions = rebuildMentionsForText(editText.trim(), editMentions);
      const textWithMentions = encodeMentions(editText.trim(), updatedMentions);
      await updatePost(post.id, { text: textWithMentions, isSpoiler: isEditSpoiler });
      handleCancelEdit();
    } catch (err) {
      console.error('Error updating post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await deletePost(post.id);
      setDeleteConfirmOpen(false);
      closeActions();
    } catch (err) {
      console.error('Error deleting post:', err);
    } finally {
      setIsSubmitting(false);
    }
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
          <ProfileAvatar
            user={post.author}
            size={40}
            alt={authorName}
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
        {isEditing ? (
          <Box sx={{ mb: 0.5 }}>
            <MentionInput
              inputRef={editInputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onMentionsChange={handleEditMentionsChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEditSubmit();
                }
              }}
              placeholder="Edit your post..."
              multiline
              maxRows={4}
              autoFocus
              disabled={isSubmitting}
              sx={{
                mb: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.default',
                  borderRadius: 2,
                  userSelect: 'text',
                },
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isEditSpoiler}
                    onChange={(e) => setIsEditSpoiler(e.target.checked)}
                    size="small"
                  />
                }
                label="Mark as spoiler"
                sx={{ ml: 0.5 }}
              />
              <IconButton
                size="small"
                onClick={handleInsertEditMention}
                disabled={isSubmitting}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                }}
                title="Mention someone"
              >
                <AlternateEmail fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <Typography
                variant="caption"
                onClick={handleCancelEdit}
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
                onClick={handleEditSubmit}
                disabled={!editText.trim() || isSubmitting}
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
                <EditOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        ) : isMeetingActivity ? (
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
            {renderMentions(post.text)}
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
            <>
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
              {isAuthor && (
                <Tooltip title="More actions">
                  <IconButton
                    size="small"
                    onClick={openActions}
                    sx={{
                      opacity: 0.7,
                      '&:hover': { opacity: 1 },
                      padding: '4px',
                    }}
                  >
                    <MoreHoriz sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Box>

        {/* Reply Form */}
        {showReplyForm && (
          <Box sx={{ mt: 1.5, ml: -1, pl: 1, borderLeft: '2px solid', borderColor: 'primary.main' }}>
            <MentionInput
              inputRef={replyInputRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onMentionsChange={handleReplyMentionsChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleReplySubmit();
                }
              }}
              placeholder={`Reply to ${authorName}...`}
              multiline
              maxRows={2}
              autoFocus
              disabled={isSubmitting}
              sx={{
                mb: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.default',
                  borderRadius: 2,
                  userSelect: 'text',
                },
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isReplySpoiler}
                    onChange={(e) => setIsReplySpoiler(e.target.checked)}
                    size="small"
                  />
                }
                label="Mark as spoiler"
                sx={{ ml: 0.5 }}
              />
              <IconButton
                size="small"
                onClick={handleInsertReplyMention}
                disabled={isSubmitting}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                }}
                title="Mention someone"
              >
                <AlternateEmail fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <Typography
                variant="caption"
              onClick={() => {
                setShowReplyForm(false);
                setReplyText('');
                setIsReplySpoiler(false);
                setReplyMentions([]);
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
          {isAuthor && (
            <>
              <Divider sx={{ my: 1 }} />
              {!isActivity && (
                <Button
                  fullWidth
                  startIcon={<EditOutlined />}
                  onClick={handleStartEdit}
                  sx={{ textTransform: 'none' }}
                >
                  Edit post
                </Button>
              )}
              <Button
                fullWidth
                color="error"
                startIcon={<DeleteOutline />}
                onClick={() => {
                  setDeleteConfirmOpen(true);
                  closeActions();
                }}
                sx={{ textTransform: 'none' }}
              >
                Delete post
              </Button>
            </>
          )}
        </Box>
        {fullPickerOpen && renderFullEmojiPicker()}
      </SwipeableDrawer>
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="delete-post-dialog-title"
        aria-describedby="delete-post-dialog-description"
      >
        <DialogTitle id="delete-post-dialog-title">Delete post</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-post-dialog-description">
            This will permanently remove the post from the feed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            disabled={isSubmitting}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PostCard;

