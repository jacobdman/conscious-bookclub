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

const EmojiInput = ({ postId, reactions = [], showAddButton = true }) => {
  const { user } = useAuth();
  const { addReaction, removeReaction } = useFeedContext();
  const [anchorEl, setAnchorEl] = useState(null);
  const [userListAnchor, setUserListAnchor] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [selectedEmojiIndex, setSelectedEmojiIndex] = useState(0);
  const longPressTimer = useRef(null);
  const touchStartTime = useRef(null);
  const touchHandledRef = useRef(false); // Track if touch event already handled the click
  const longPressTriggeredRef = useRef(false);
  const swipeStartXRef = useRef(null);

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

  const handleViewerTouchStart = (event) => {
    if (!event.touches?.length) return;
    swipeStartXRef.current = event.touches[0].clientX;
  };

  const handleViewerTouchEnd = (event) => {
    if (swipeStartXRef.current === null || !event.changedTouches?.length) return;
    const deltaX = event.changedTouches[0].clientX - swipeStartXRef.current;
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

  const handleReactionClick = async (emoji, event) => {
    // If touch event already handled this (mobile quick tap), ignore click
    if (touchHandledRef.current) {
      touchHandledRef.current = false; // Reset for next interaction
      return;
    }
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    // Close user list if open (from hover on desktop)
    if (userListOpen) {
      handleUserListClose();
      // Continue to toggle reaction after closing user list
    }

    const userReaction = reactionsByEmoji[emoji]?.find(r => r.userId === user?.uid);
    if (userReaction) {
      // User already reacted, remove it
      await removeReaction(postId, emoji);
    } else {
      // Check if user has reached the limit
      if (userReactionCount >= maxReactions) {
        alert(`You can only add ${maxReactions} reactions per post. Remove one to add another.`);
        return;
      }
      // User hasn't reacted, add it
      await addReaction(postId, emoji);
    }
  };

  const handleReactionMouseEnter = (event, emoji) => {
    openUserList(emoji, event.currentTarget, { withHaptics: false });
  };

  const handleReactionMouseLeave = () => {
    closeUserList();
  };

  const handleReactionTouchStart = (event, emoji) => {
    event.preventDefault(); // prevent native long-press context menu
    touchStartTime.current = Date.now();
    touchHandledRef.current = false; // Reset flag
    longPressTriggeredRef.current = false;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    longPressTimer.current = setTimeout(() => {
      openUserList(emoji, event.currentTarget, { withHaptics: true });
      touchHandledRef.current = true; // Mark as handled (long press)
      longPressTriggeredRef.current = true;
      // Prevent click event from firing after long press
      event.preventDefault();
    }, 450); // shorter than native context menu threshold
  };

  const handleReactionTouchEnd = (event, emoji) => {
    const touchDuration = Date.now() - (touchStartTime.current || 0);
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // If it was a quick tap (not long press), toggle the reaction
    if (!longPressTriggeredRef.current && touchDuration < 450) {
      closeUserList();
      touchHandledRef.current = true; // Mark as handled to prevent click event
      // Trigger the reaction toggle for quick tap
      handleReactionClick(emoji, event);
    } else {
      // It was a long press, prevent the click
      touchHandledRef.current = true; // Already handled by long press
      event.preventDefault();
    }
    longPressTriggeredRef.current = false;
  };

  const handleReactionTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    closeUserList();
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
              onTouchStart={(e) => {
                e.stopPropagation();
                handleReactionTouchStart(e, emoji);
              }}
              onTouchEnd={(e) => handleReactionTouchEnd(e, emoji)}
              onTouchCancel={handleReactionTouchCancel}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              size="small"
              sx={{
                cursor: 'pointer',
                height: 24,
                fontSize: '0.75rem',
                backgroundColor: userReacted ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                border: userReacted ? '1px solid' : 'none',
                borderColor: userReacted ? 'primary.main' : 'transparent',
                touchAction: 'manipulation',
                '&:hover': {
                  backgroundColor: userReacted ? 'rgba(25, 118, 210, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                  color: userReacted ? 'primary.main' : 'inherit',
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
              '&:hover': {
                opacity: 1,
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

      {/* User List Popover - Slack style */}
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
        onTouchStart={handleViewerTouchStart}
        onTouchEnd={handleViewerTouchEnd}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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

