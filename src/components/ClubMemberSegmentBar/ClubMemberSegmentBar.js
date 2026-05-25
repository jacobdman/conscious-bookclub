import React, { useState, useCallback } from 'react';
import { Box, Typography, Tooltip, useMediaQuery } from '@mui/material';
import ProfileAvatar from 'components/ProfileAvatar';
import { formatClubGoalQuantity } from 'utils/clubGoalReportDisplay';

const AVATAR_SIZE = 24;
const MIN_SEGMENT_PCT_FOR_AVATAR = 7;
const MIN_SEGMENT_PX = 6;
const ZERO_SEGMENT_PX = 1;

/**
 * Segmented horizontal bar: one flex segment per member contribution + optional remainder.
 * @param {object} props
 * @param {Array} props.segments - { userId, name, user, value, fill, widthPct? }
 * @param {number} [props.remainder] - unused portion (white segment)
 * @param {string} [props.unitSuffix]
 * @param {number} [props.barHeight]
 */
const ClubMemberSegmentBar = ({
  segments = [],
  remainder = 0,
  unitSuffix = '',
  barHeight = 52,
  ariaLabel = 'Club contribution by member',
}) => {
  const isTouchPrimary = useMediaQuery('(hover: none) and (pointer: coarse)');
  const [selectedId, setSelectedId] = useState(null);

  const selected = segments.find((s) => s.userId === selectedId);
  const getTip = (seg) =>
    `${seg.name}: ${formatClubGoalQuantity(seg.value)}${unitSuffix}`;

  const handleActivate = useCallback(
    (event, seg) => {
      event.stopPropagation();
      if (!isTouchPrimary) return;
      setSelectedId((prev) => (prev === seg.userId ? null : seg.userId));
    },
    [isTouchPrimary],
  );

  return (
    <Box
      sx={{
        borderRadius: 2,
        bgcolor: 'action.hover',
        py: 1.25,
        px: 0.75,
      }}
    >
      <Box
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        sx={{
          display: 'flex',
          width: '100%',
          height: barHeight,
          borderRadius: 1.5,
          overflow: 'hidden',
        }}
        aria-label={ariaLabel}
      >
        {segments.map((seg) => {
          const tip = getTip(seg);
          const value = Number(seg.value) || 0;
          const isZero = value <= 0;
          const showAvatar =
            !isZero && (seg.widthPct ?? 0) >= MIN_SEGMENT_PCT_FOR_AVATAR;
          const minPx = isZero
            ? ZERO_SEGMENT_PX
            : showAvatar
              ? AVATAR_SIZE + 4
              : MIN_SEGMENT_PX;
          const flexBasis = isZero
            ? `${ZERO_SEGMENT_PX}px`
            : `${minPx}px`;
          const flexGrow = isZero ? 0 : value;
          const flexShrink = isZero ? 0 : 1;
          const isSelected = selectedId === seg.userId;
          const segment = (
            <Box
              component="button"
              type="button"
              aria-label={tip}
              aria-pressed={isSelected}
              onClick={(e) => handleActivate(e, seg)}
              sx={{
                flex: `${flexGrow} ${flexShrink} ${flexBasis}`,
                flexShrink,
                minWidth: minPx,
                bgcolor: seg.fill,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                p: 0,
                cursor: 'pointer',
                outline: 'none',
                opacity: isSelected ? 0.92 : 1,
                boxShadow: isSelected
                  ? 'inset 0 0 0 2px rgba(255,255,255,0.85)'
                  : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {showAvatar && (
                <ProfileAvatar
                  user={seg.user}
                  size={AVATAR_SIZE}
                  showEntryRing={false}
                  disableGoalModal
                  sx={{
                    border: '2px solid',
                    borderColor: 'background.paper',
                    boxShadow: 1,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </Box>
          );

          if (isTouchPrimary) {
            return <React.Fragment key={seg.userId}>{segment}</React.Fragment>;
          }

          return (
            <Tooltip key={seg.userId} title={tip} placement="top">
              {segment}
            </Tooltip>
          );
        })}
        {remainder > 0 && (
          <Box
            sx={{
              flex: `${remainder} 1 8px`,
              flexShrink: 1,
              bgcolor: 'background.paper',
              minWidth: 8,
            }}
            aria-hidden
          />
        )}
      </Box>
      {isTouchPrimary && selected && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 0.75, fontWeight: 600 }}
        >
          {getTip(selected)}
        </Typography>
      )}
    </Box>
  );
};

export default ClubMemberSegmentBar;
