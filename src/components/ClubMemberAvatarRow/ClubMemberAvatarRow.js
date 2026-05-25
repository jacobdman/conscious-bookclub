import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ProfileAvatar from 'components/ProfileAvatar';

const STATUS_STYLES = {
  completed: {
    ring: 2,
    ringColor: 'success.main',
    opacity: 1,
  },
  on_track: {
    ring: 2,
    ringColor: 'success.main',
    opacity: 1,
  },
  in_progress: {
    ring: 2,
    ringColor: 'warning.main',
    opacity: 1,
  },
  pending: {
    ring: 1,
    ringColor: 'divider',
    opacity: 0.55,
  },
};

/**
 * Filtered avatar row. Renders only members with progress (completed, on_track,
 * or in_progress) and an empty-state message when none qualify.
 *
 * @param {object} props
 * @param {Array} props.members - { userId, user, name, status, sublabel? }
 * @param {string} [props.emptyMessage]
 * @param {number} [props.size]
 */
const ClubMemberAvatarRow = ({
  members = [],
  size = 36,
  emptyMessage = 'No members have completed this yet',
}) => {
  const contributing = members.filter(
    (m) => m.status && m.status !== 'pending',
  );

  if (contributing.length === 0) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ py: 1, fontStyle: 'italic' }}
      >
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.25,
        justifyContent: 'flex-start',
      }}
    >
      {contributing.map((m) => {
        const style = STATUS_STYLES[m.status] || STATUS_STYLES.pending;
        const showCheck = m.status === 'completed' || m.status === 'on_track';
        return (
          <Box
            key={m.userId}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: size + 16,
              opacity: style.opacity,
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <ProfileAvatar
                user={m.user}
                size={size}
                showEntryRing={false}
                disableGoalModal
                sx={{
                  boxShadow: style.ring,
                  outline: `${style.ring}px solid`,
                  outlineColor: style.ringColor,
                  outlineOffset: 0,
                }}
              />
              {showCheck && (
                <CheckCircleIcon
                  sx={{
                    position: 'absolute',
                    right: -4,
                    bottom: -4,
                    fontSize: 16,
                    color: 'success.main',
                    bgcolor: 'background.paper',
                    borderRadius: '50%',
                  }}
                />
              )}
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                mt: 0.5,
                textAlign: 'center',
                maxWidth: size + 24,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}
            >
              {(m.name || 'Member').split(' ')[0]}
            </Typography>
            {m.sublabel && (
              <Typography
                variant="caption"
                color="text.primary"
                sx={{
                  fontWeight: 600,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {m.sublabel}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default ClubMemberAvatarRow;
