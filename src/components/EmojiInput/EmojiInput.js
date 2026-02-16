import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AddReaction, ChevronLeft, ChevronRight } from '@mui/icons-material';
// UI
import { Box, Button, Chip, IconButton, MobileStepper, Popover, Stack, Typography } from '@mui/material';
// Context
import { useAuth } from 'AuthContext';
import useFeedContext from 'contexts/Feed';
// Components
import ProfileAvatar from 'components/ProfileAvatar';
// Utils
import { EMOJI_CATEGORIES } from 'utils/emojiCategories';
import { triggerHaptic } from 'utils/haptics';
import { alpha } from '@mui/material/styles';

const EmojiInput = ({ postId, reactions = [], showAddButton = true }) => {
  const { user } = useAuth();
  const { addReaction, removeReaction } = useFeedContext();
  const [anchorEl, setAnchorEl] = useState(null);
  const [userListAnchor, setUserListAnchor] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [selectedEmojiIndex, setSelectedEmojiIndex] = useState(0);
  const longPressTimer = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const gestureHandledRef = useRef(false); // Single source of truth: pointer path handled this gesture (suppress click)
  const swipeStartXRef = useRef(null);
  const LONG_PRESS_MS = 450;

  // Group reactions by emoji
  const reactionsByEmoji = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {});

  const emojiKeys = useMemo(() => Object.keys(reactionsByEmoji), [reactionsByEmoji]);

  // Count user's reactions on this post
  const userReactionCount = reactions.filter(r => r.userId === user?.uid).length;
  const maxReactions = 5;

  const openUserList = (emoji, anchor, { withHaptics = true } = {}) => {
    const index = emojiKeys.indexOf(emoji);
    setSelectedEmojiIndex(index >= 0 ? index : 0);
    setSelectedEmoji(emoji);
    setUserListAnchor(anchor);
    if (withHaptics) {
      triggerHaptic('medium');
    }
  };

  const closeUserList = () => {
    setUserListAnchor(null);
    setSelectedEmoji(null);
    setSelectedEmojiIndex(0);
  };

  const goToEmojiIndex = (nextIndex) => {
    if (emojiKeys.length === 0) return;
    const normalized = ((nextIndex % emojiKeys.length) + emojiKeys.length) % emojiKeys.length;
    const nextEmoji = emojiKeys[normalized];
    setSelectedEmojiIndex(normalized);
    setSelectedEmoji(nextEmoji);
  };

  const handleViewerPointerDown = (event) => {
    if (event.pointerType !== 'touch') return;
    swipeStartXRef.current = event.clientX;
  };

  const handleViewerPointerUp = (event) => {
    if (event.pointerType !== 'touch') return;
    if (swipeStartXRef.current === null) return;
    const deltaX = event.clientX - swipeStartXRef.current;
    swipeStartXRef.current = null;
    const threshold = 30;
    if (Math.abs(deltaX) < threshold) return;
    if (deltaX > 0) {
      goToEmojiIndex(selectedEmojiIndex - 1);
    } else {
      goToEmojiIndex(selectedEmojiIndex + 1);
    }
  };

  const handleOpenPicker = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePicker = () => {
    setAnchorEl(null);
  };

  const handleEmojiSelect = async (emoji) => {
    // Check if user has reached the limit
    if (userReactionCount >= maxReactions) {
      const hasThisEmoji = reactionsByEmoji[emoji]?.some(r => r.userId === user?.uid);
      if (!hasThisEmoji) {
        // User is trying to add a new emoji but has reached limit
        alert(`You can only add ${maxReactions} reactions per post. Remove one to add another.`);
        handleClosePicker();
        return;
      }
    }

    try {
      await addReaction(postId, emoji);
      handleClosePicker();
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  const toggleReaction = async (emoji, { haptic = true } = {}) => {
    const userReaction = reactionsByEmoji[emoji]?.find(r => r.userId === user?.uid);
    if (userReaction) {
      await removeReaction(postId, emoji);
    } else {
      if (userReactionCount >= maxReactions) {
        alert(`You can only add ${maxReactions} reactions per post. Remove one to add another.`);
        return;
      }
      await addReaction(postId, emoji);
    }
    if (haptic) {
      triggerHaptic('light');
    }
  };

  const handleReactionClick = async (emoji, event) => {
    if (gestureHandledRef.current) {
      gestureHandledRef.current = false;
      return;
    }
    if (userListOpen) {
      handleUserListClose();
    }
    await toggleReaction(emoji, { haptic: true });
  };

  const handleReactionMouseEnter = (event, emoji) => {
    openUserList(emoji, event.currentTarget, { withHaptics: false });
  };

  const handleReactionMouseLeave = () => {
    closeUserList();
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleReactionPointerDown = (event, emoji) => {
    if (event.pointerType !== 'touch') return;
    event.preventDefault();
    gestureHandledRef.current = false;
    longPressTriggeredRef.current = false;
    cancelLongPress();
    const anchor = event.currentTarget;
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      openUserList(emoji, anchor, { withHaptics: true });
      longPressTriggeredRef.current = true;
      gestureHandledRef.current = true;
    }, LONG_PRESS_MS);
  };

  const handleReactionPointerUp = (event, emoji) => {
    if (event.pointerType !== 'touch') return;
    cancelLongPress();
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    gestureHandledRef.current = true;
    toggleReaction(emoji, { haptic: true });
  };

  const handleReactionPointerCancel = () => {
    if (longPressTimer.current) cancelLongPress();
    longPressTriggeredRef.current = false;
  };

  const handleUserListClose = () => {
    closeUserList();
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const hasUserReacted = (emoji) => {
    return reactionsByEmoji[emoji]?.some(r => r.userId === user?.uid);
  };

  const open = Boolean(anchorEl);
  const userListOpen = Boolean(userListAnchor);
  const selectedEmojiUsers = selectedEmoji ? reactionsByEmoji[selectedEmoji] || [] : [];

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
        {Object.keys(reactionsByEmoji).map((emoji) => {
          const count = reactionsByEmoji[emoji].length;
          const userReacted = hasUserReacted(emoji);
          return (
            <Chip
              key={emoji}
              label={`${emoji} ${count > 1 ? count : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleReactionClick(emoji, e);
              }}
              onMouseEnter={(e) => handleReactionMouseEnter(e, emoji)}
              onMouseLeave={handleReactionMouseLeave}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleReactionPointerDown(e, emoji);
              }}
              onPointerUp={(e) => handleReactionPointerUp(e, emoji)}
              onPointerCancel={handleReactionPointerCancel}
              onPointerLeave={handleReactionPointerCancel}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              size="small"
              sx={{
                cursor: 'pointer',
                height: 24,
                fontSize: '0.75rem',
                backgroundColor: (theme) =>
                  userReacted
                    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.35 : 0.12)
                    : theme.palette.action.selected,
                border: '1px solid',
                borderColor: userReacted ? 'primary.main' : 'transparent',
                color: 'text.primary',
                touchAction: 'manipulation',
                '&:hover': {
                  backgroundColor: (theme) =>
                    userReacted
                      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.5 : 0.2)
                      : theme.palette.action.hover,
                  color: userReacted ? 'primary.main' : 'text.primary',
                },
                transition: 'all 0.2s',
              }}
            />
          );
        })}
        {showAddButton && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenPicker(e);
            }}
            sx={{
              padding: '2px',
              minHeight: 24,
              minWidth: 24,
              opacity: 0.6,
              color: 'text.secondary',
              '&:hover': {
                opacity: 1,
                color: 'text.primary',
                backgroundColor: 'action.hover',
              },
            }}
          >
            <AddReaction sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        )}
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClosePicker}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            maxWidth: 320,
            maxHeight: 400,
            p: 1.5,
          },
        }}
      >
        <Box sx={{ overflowY: 'auto', maxHeight: 350 }}>
          {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
            <Box key={category} sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontWeight: 600,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: '0.7rem',
                }}
              >
                {category}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: 0.5,
                }}
              >
                {emojis.map((emoji) => (
                  <Button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    sx={{
                      minWidth: 'auto',
                      width: 32,
                      height: 32,
                      padding: 0,
                      fontSize: '1.2rem',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        transform: 'scale(1.2)',
                      },
                      transition: 'all 0.2s',
                    }}
                  >
                    {emoji}
                  </Button>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Popover>

      {/* User List Popover - Slack style; swipe handlers on content only to avoid backdrop close/reopen loops */}
      <Popover
        open={userListOpen}
        anchorEl={userListAnchor}
        onClose={handleUserListClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        disableRestoreFocus
        PaperProps={{
          sx: {
            p: 1,
            minWidth: 200,
            maxWidth: 280,
            maxHeight: 300,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <Box
          sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
          onPointerDown={handleViewerPointerDown}
          onPointerUp={handleViewerPointerUp}
          onPointerLeave={() => { swipeStartXRef.current = null; }}
        >
          {emojiKeys.length > 1 && (
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1 }}>
              <IconButton size="small" onClick={() => goToEmojiIndex(selectedEmojiIndex - 1)}>
                <ChevronLeft fontSize="small" />
              </IconButton>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {selectedEmoji} {selectedEmojiUsers.length} {selectedEmojiUsers.length === 1 ? 'reaction' : 'reactions'}
              </Typography>
              <IconButton size="small" onClick={() => goToEmojiIndex(selectedEmojiIndex + 1)}>
                <ChevronRight fontSize="small" />
              </IconButton>
            </Stack>
          )}
          {emojiKeys.length <= 1 && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                px: 1,
                fontWeight: 600,
                color: 'text.secondary',
                fontSize: '0.7rem',
              }}
            >
              {selectedEmoji} {selectedEmojiUsers.length} {selectedEmojiUsers.length === 1 ? 'reaction' : 'reactions'}
            </Typography>
          )}
          {emojiKeys.length > 1 && (
            <MobileStepper
              variant="dots"
              steps={emojiKeys.length}
              position="static"
              activeStep={selectedEmojiIndex}
              nextButton={<Box />}
              backButton={<Box />}
              sx={{
                background: 'transparent',
                justifyContent: 'center',
                py: 0,
                px: 1,
                '& .MuiMobileStepper-dot': {
                  width: 7,
                  height: 7,
                  mx: 0.25,
                },
                '& .MuiMobileStepper-dotActive': {
                  backgroundColor: 'text.primary',
                },
              }}
            />
          )}
          <Box sx={{ overflowY: 'auto', maxHeight: 250 }}>
            {selectedEmojiUsers.map((reaction) => (
              <Box
                key={reaction.id || `${reaction.userId}-${reaction.emoji}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ProfileAvatar
                  user={reaction.user}
                  size={24}
                  alt={reaction.user?.displayName || 'User'}
                  showEntryRing={false}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.875rem',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {reaction.user?.displayName || reaction.userId || 'Unknown'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default EmojiInput;

