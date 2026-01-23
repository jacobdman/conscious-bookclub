import React, { useEffect, useState } from 'react';
// UI
import { Avatar, Box } from '@mui/material';
// Context
import useClubContext from 'contexts/Club';
import useClubReporting from 'contexts/ClubReporting';
// Components
import UsersGoalsModal from 'components/UsersGoalsModal';
// Utils
import { formatLocalDate } from 'utils/dateHelpers';
import { getTodayEntries } from 'utils/goalHelpers';

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

const entryRingCache = new Map();

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
  const { currentClub } = useClubContext();
  const { clubGoalsByUser, fetchUserGoals } = useClubReporting();
  const [hasEntryToday, setHasEntryToday] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const userId = user?.uid || user?.id || user?.userId || user?.user_id;
  const displayName = user?.displayName || user?.name || user?.email || 'User';
  const photoUrl = user?.photoUrl || user?.photoURL || null;
  const medal = rank && medalByRank[rank] ? medalByRank[rank] : null;
  const rankLabel = showRankBadge ? getRankBadgeLabel(rank) : null;

  useEffect(() => {
    if (!showEntryRing || !userId || !currentClub?.id) return;

    const todayKey = formatLocalDate(new Date());
    const cacheKey = `${currentClub.id}-${userId}-${todayKey}`;

    if (entryRingCache.has(cacheKey)) {
      setHasEntryToday(entryRingCache.get(cacheKey));
      return;
    }

    let isMounted = true;

    const loadEntries = async () => {
      try {
        const cachedGoals = clubGoalsByUser[userId];
        const goals = cachedGoals || await fetchUserGoals(userId);
        const hasEntry = (goals || []).some((goal) => {
          const entries = getTodayEntries(goal.entries || []);
          return entries.length > 0;
        });

        entryRingCache.set(cacheKey, hasEntry);
        if (isMounted) {
          setHasEntryToday(hasEntry);
        }
      } catch (err) {
        console.error('Error checking goal entries for avatar ring:', err);
      }
    };

    loadEntries();

    return () => {
      isMounted = false;
    };
  }, [showEntryRing, userId, currentClub?.id, clubGoalsByUser, fetchUserGoals]);

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
