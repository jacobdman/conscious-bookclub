import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AddReaction } from '@mui/icons-material';
// UI
import {
  Box,
  Button,
  Chip,
  IconButton,
  Popover,
  Stack,
  SwipeableDrawer,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
// Context
import { useAuth } from 'AuthContext';
import useFeedContext from 'contexts/Feed';
// Components
import ProfileAvatar from 'components/ProfileAvatar';
// Utils
import { EMOJI_CATEGORIES } from 'utils/emojiCategories';
import { triggerHaptic } from 'utils/haptics';
import { alpha } from '@mui/material/styles';

const LONG_PRESS_MS = 500;

const EmojiInput = ({ postId, reactions = [], showAddButton = true }) => {
  const { user } = useAuth();
  const { addReaction, removeReaction } = useFeedContext();
  const [pickerAnchor, setPickerAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTabIndex, setDrawerTabIndex] = useState(0);
  const touchTimerRef = useRef(null);
  const touchMovedRef = useRef(false);
  const longPressHandledRef = useRef(false);
  /** When true, we already handled this gesture in onTouchEnd (short tap); suppress the synthetic click. */
  const touchTapHandledRef = useRef(false);

  // Group reactions by emoji
  const reactionsByEmoji = useMemo(
    () =>
      reactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) acc[reaction.emoji] = [];
        acc[reaction.emoji].push(reaction);
        return acc;
      }, {}),
    [reactions]
  );

  const emojiKeys = useMemo(() => Object.keys(reactionsByEmoji), [reactionsByEmoji]);
  const userReactionCount = reactions.filter((r) => r.userId === user?.uid).length;
  const maxReactions = 5;

  const hasUserReacted = (emoji) =>
    reactionsByEmoji[emoji]?.some((r) => r.userId === user?.uid);

  const toggleReaction = async (emoji, { haptic = true } = {}) => {
    const userReaction = reactionsByEmoji[emoji]?.find((r) => r.userId === user?.uid);
    if (userReaction) {
      await removeReaction(postId, emoji);
    } else {
      if (userReactionCount >= maxReactions) {
        alert(`You can only add ${maxReactions} reactions per post. Remove one to add another.`);
        return;
      }
      await addReaction(postId, emoji);
    }
    if (haptic) triggerHaptic('light');
  };

  const handleOpenPicker = (e) => {
    e.stopPropagation();
    setPickerAnchor(e.currentTarget);
  };

  const handleClosePicker = () => setPickerAnchor(null);

  const handleEmojiSelect = async (emoji) => {
    if (userReactionCount >= maxReactions) {
      const hasThisEmoji = reactionsByEmoji[emoji]?.some((r) => r.userId === user?.uid);
      if (!hasThisEmoji) {
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

  const openDrawerForEmoji = (emoji) => {
    const index = emojiKeys.indexOf(emoji);
    setDrawerTabIndex(index >= 0 ? index : 0);
    setDrawerOpen(true);
    triggerHaptic('medium');
    longPressHandledRef.current = true;
  };

  const closeDrawer = () => setDrawerOpen(false);

  // Touch: long-press opens drawer; short tap toggles in onTouchEnd (click suppressed when long-press fired)
  const handleChipTouchStart = (emoji) => {
    touchMovedRef.current = false;
    touchTimerRef.current = setTimeout(() => {
      touchTimerRef.current = null;
      openDrawerForEmoji(emoji);
    }, LONG_PRESS_MS);
  };

  const handleChipTouchMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    touchMovedRef.current = true;
  };

  const handleChipTouchEnd = (emoji) => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
      if (!touchMovedRef.current) {
        touchTapHandledRef.current = true; // suppress synthetic click that will fire after
        toggleReaction(emoji, { haptic: true });
      }
    }
  };

  const handleChipClick = (emoji, e) => {
    e.stopPropagation();
    if (longPressHandledRef.current) {
      longPressHandledRef.current = false;
      return;
    }
    // On touch devices we already handled the tap in onTouchEnd; ignore synthetic click
    if (touchTapHandledRef.current) {
      touchTapHandledRef.current = false;
      return;
    }
    toggleReaction(emoji, { haptic: true });
  };

  const tooltipTitle = (emoji) => {
    const list = reactionsByEmoji[emoji] || [];
    const names = list.map(
      (r) => r.user?.displayName || r.userId || 'Unknown'
    );
    return names.length ? names.join(', ') : '';
  };

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  const pickerOpen = Boolean(pickerAnchor);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
        {emojiKeys.map((emoji) => {
          const count = reactionsByEmoji[emoji].length;
          const userReacted = hasUserReacted(emoji);
          const label = count > 1 ? `${emoji} ${count}` : emoji;
          return (
            <Tooltip key={emoji} title={tooltipTitle(emoji)} placement="top">
              <Chip
                label={label}
                onClick={(e) => handleChipClick(emoji, e)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={() => handleChipTouchStart(emoji)}
                onTouchMove={handleChipTouchMove}
                onTouchEnd={() => handleChipTouchEnd(emoji)}
                onTouchCancel={() => {
                  if (touchTimerRef.current) {
                    clearTimeout(touchTimerRef.current);
                    touchTimerRef.current = null;
                  }
                }}
                size="small"
                sx={{
                  cursor: 'pointer',
                  height: 24,
                  fontSize: '0.75rem',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
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
            </Tooltip>
          );
        })}
        {showAddButton && (
          <IconButton
            size="small"
            onClick={handleOpenPicker}
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

      {/* Emoji picker popover */}
      <Popover
        open={pickerOpen}
        anchorEl={pickerAnchor}
        onClose={handleClosePicker}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{
          sx: { maxWidth: 320, maxHeight: 400, p: 1.5 },
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
                {emojis.map((e) => (
                  <Button
                    key={e}
                    onClick={() => handleEmojiSelect(e)}
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
                    {e}
                  </Button>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Popover>

      {/* Bottom drawer: who reacted (Slack-style with tabs) */}
      <SwipeableDrawer
        anchor="bottom"
        open={drawerOpen}
        onClose={closeDrawer}
        onOpen={() => {}}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            maxHeight: '70vh',
            pb: 2,
          },
        }}
      >
        <Box sx={{ px: 1 }}>
          <Stack direction="row" justifyContent="center" sx={{ py: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 4,
                backgroundColor: 'divider',
                borderRadius: 2,
              }}
            />
          </Stack>
          {emojiKeys.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No reactions yet
            </Typography>
          ) : (
            <>
              <Tabs
                value={Math.min(drawerTabIndex, emojiKeys.length - 1)}
                onChange={(_, v) => setDrawerTabIndex(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 40,
                  '& .MuiTab-root': { minHeight: 40, py: 0.5 },
                }}
              >
                {emojiKeys.map((emoji, idx) => {
                  const count = reactionsByEmoji[emoji].length;
                  return (
                    <Tab
                      key={emoji}
                      label={`${emoji} ${count}`}
                      id={`reaction-tab-${idx}`}
                      aria-controls={`reaction-tabpanel-${idx}`}
                    />
                  );
                })}
              </Tabs>
              {emojiKeys.map((emoji, idx) => (
                <Box
                  key={emoji}
                  role="tabpanel"
                  hidden={drawerTabIndex !== idx}
                  id={`reaction-tabpanel-${idx}`}
                  aria-labelledby={`reaction-tab-${idx}`}
                  sx={{ pt: 1 }}
                >
                  {drawerTabIndex === idx && (
                    <Box sx={{ overflowY: 'auto', maxHeight: 280 }}>
                      {(reactionsByEmoji[emoji] || []).map((reaction) => (
                        <Box
                          key={reaction.id || `${reaction.userId}-${reaction.emoji}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1,
                            py: 0.75,
                            borderRadius: 1,
                            '&:hover': { backgroundColor: 'action.hover' },
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
                  )}
                </Box>
              ))}
            </>
          )}
        </Box>
      </SwipeableDrawer>
    </Box>
  );
};

export default EmojiInput;
