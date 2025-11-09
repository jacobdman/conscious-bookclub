import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Chip, Popover, Typography, Avatar } from '@mui/material';
import useFeedContext from 'contexts/Feed';
import { useAuth } from 'AuthContext';

// Common emojis organized by category
const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
  'Gestures': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Reactions': ['👍', '👎', '❤️', '🔥', '😮', '😢', '😡', '🎉', '👏', '🙌', '😊', '😂', '😍', '🤔', '😴', '😎', '🤗', '😱', '😭', '😤'],
};

const EmojiInput = ({ postId, reactions = [] }) => {
  const { user } = useAuth();
  const { addReaction, removeReaction } = useFeedContext();
  const [anchorEl, setAnchorEl] = useState(null);
  const [userListAnchor, setUserListAnchor] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const longPressTimer = useRef(null);
  const touchStartTime = useRef(null);

  // Group reactions by emoji
  const reactionsByEmoji = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {});

  // Count user's reactions on this post
  const userReactionCount = reactions.filter(r => r.userId === user?.uid).length;
  const maxReactions = 5;

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

  const handleReactionClick = async (emoji) => {
    // Close user list if open
    if (userListOpen) {
      handleUserListClose();
      return; // Don't toggle reaction if user list was open
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
    setSelectedEmoji(emoji);
    setUserListAnchor(event.currentTarget);
  };

  const handleReactionMouseLeave = () => {
    setUserListAnchor(null);
    setSelectedEmoji(null);
  };

  const handleReactionTouchStart = (event, emoji) => {
    touchStartTime.current = Date.now();
    longPressTimer.current = setTimeout(() => {
      setSelectedEmoji(emoji);
      setUserListAnchor(event.currentTarget);
      // Prevent click event from firing after long press
      event.preventDefault();
    }, 500); // 500ms for long press
  };

  const handleReactionTouchEnd = (event) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // If it was a quick tap (not long press), don't show popup
    const touchDuration = Date.now() - (touchStartTime.current || 0);
    if (touchDuration < 500) {
      setUserListAnchor(null);
      setSelectedEmoji(null);
    } else {
      // It was a long press, prevent the click
      event.preventDefault();
    }
  };

  const handleReactionTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setUserListAnchor(null);
    setSelectedEmoji(null);
  };

  const handleUserListClose = () => {
    setUserListAnchor(null);
    setSelectedEmoji(null);
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
              onClick={() => handleReactionClick(emoji)}
              onMouseEnter={(e) => handleReactionMouseEnter(e, emoji)}
              onMouseLeave={handleReactionMouseLeave}
              onTouchStart={(e) => handleReactionTouchStart(e, emoji)}
              onTouchEnd={handleReactionTouchEnd}
              onTouchCancel={handleReactionTouchCancel}
              size="small"
              sx={{
                cursor: 'pointer',
                height: 24,
                fontSize: '0.75rem',
                backgroundColor: userReacted ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                border: userReacted ? '1px solid' : 'none',
                borderColor: userReacted ? 'primary.main' : 'transparent',
                '&:hover': {
                  backgroundColor: userReacted ? 'rgba(25, 118, 210, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                  color: userReacted ? 'primary.main' : 'inherit',
                },
                transition: 'all 0.2s',
              }}
            />
          );
        })}
        <Button
          size="small"
          onClick={handleOpenPicker}
          sx={{
            minWidth: 'auto',
            padding: '2px 6px',
            minHeight: 24,
            fontSize: '0.75rem',
            opacity: 0.6,
            '&:hover': {
              opacity: 1,
              backgroundColor: 'action.hover',
            },
          }}
        >
          +
        </Button>
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
      >
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 1,
              px: 1,
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.7rem',
            }}
          >
            {selectedEmoji} {selectedEmojiUsers.length} {selectedEmojiUsers.length === 1 ? 'reaction' : 'reactions'}
          </Typography>
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
                <Avatar
                  src={reaction.user?.photoUrl}
                  alt={reaction.user?.displayName || 'User'}
                  sx={{ width: 24, height: 24 }}
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

