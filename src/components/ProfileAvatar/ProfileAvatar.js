import React, { useState, useMemo } from 'react';
// UI
import { Avatar, Box } from '@mui/material';
// Context
import useClubContext from 'contexts/Club';
// Components
import UsersGoalsModal from 'components/UsersGoalsModal';
// Utils
import { getTodayBoundaries } from 'utils/goalHelpers';

const medalByRank = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const getRankBadgeLabel = (rank) => {
  if (!rank) return null;
  if ([1, 2, 3].includes(rank)) return null
  return `${rank}th`;
};

const ProfileAvatar = ({
  user,
  size = 40,
  rank = null,
  alt,
  sx = {},
  showRankBadge = false,
  showEntryRing = true,
  disableGoalModal = false,
  onClick,
  ...props
}) => {
  const { currentClub, membersGoalStatus } = useClubContext();
  const [modalOpen, setModalOpen] = useState(false);

  const userId = user?.uid || user?.id || user?.userId || user?.user_id;
  const displayName = user?.displayName || user?.name || user?.email || 'User';
  const photoUrl = user?.photoUrl || user?.photoURL || null;
  const medal = rank && medalByRank[rank] ? medalByRank[rank] : null;
  const rankLabel = showRankBadge ? getRankBadgeLabel(rank) : null;

  // Check if user has goal entry today (computed from cached data)
  const hasEntryToday = useMemo(() => {
    if (!showEntryRing || !userId || !currentClub?.id) return false;
    
    const lastEntryAt = membersGoalStatus[userId];
    if (!lastEntryAt) {
      return false;
    }
    
    // Check if lastEntryAt falls within today's boundaries (local timezone)
    const entryDate = new Date(lastEntryAt);
    const { start, end } = getTodayBoundaries();
    
    const isToday = entryDate >= start && entryDate < end;
    
    return isToday;
  }, [showEntryRing, userId, currentClub?.id, membersGoalStatus]);

  const handleAvatarClick = (event) => {
    if (disableGoalModal || !userId) {
      onClick?.(event);
      return;
    }

    setModalOpen(true);
  };

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Avatar
          src={photoUrl}
          alt={alt || displayName}
          onClick={handleAvatarClick}
          sx={(theme) => {
            const baseStyles = {
              width: size,
              height: size,
              boxShadow: showEntryRing && hasEntryToday
                ? `0 0 0 3px ${theme.palette.accent.main}`
                : 'none',
              cursor: disableGoalModal ? 'default' : 'pointer',
            };
            const overrideStyles = typeof sx === 'function' ? sx(theme) : sx;
            return { ...baseStyles, ...overrideStyles };
          }}
          {...props}
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        {medal && (
          <Box
            sx={{
              position: 'absolute',
              bottom: Math.round(-size * 0.08),
              right: Math.round(-size * 0.08),
              width: Math.max(24, Math.round(size * 0.42)),
              height: Math.max(24, Math.round(size * 0.42)),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: Math.max(14, Math.round(size * 0.45)),
              lineHeight: 1,
            }}
          >
            {medal}
          </Box>
        )}
        {rankLabel && (
          <Box
            sx={{
              position: 'absolute',
              bottom: Math.round(-size * 0.05),
              right: Math.round(-size * 0.05),
              minWidth: Math.max(24, Math.round(size * 0.38)),
              height: Math.max(20, Math.round(size * 0.32)),
              px: 0.75,
              borderRadius: '999px',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: Math.max(12, Math.round(size * 0.22)),
              lineHeight: 1,
            }}
          >
            {rankLabel}
          </Box>
        )}
      </Box>

      {!disableGoalModal && userId && (
        <UsersGoalsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          user={user}
        />
      )}
    </>
  );
};

export default ProfileAvatar;
