import React from 'react';
import { Box, IconButton, Badge, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt';
import SkipNextIcon from '@mui/icons-material/SkipNext';

const actionCellSx = {
  flex: 1,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minWidth: 0,
  py: 1,
  borderRight: 1,
  borderColor: 'divider',
  '&:last-of-type': { borderRight: 'none' },
};

const ActionBar = ({
  isBacklogReview,
  /** When true, card is already in the backlog — new super likes are not allowed. */
  superLikeBlocked = false,
  remainingSuperLikes,
  onPass,
  onLike,
  onSuperLike,
  onBookmark,
  onStillInterested,
  onNoLongerInterested,
  onSkip,
}) => {
  if (isBacklogReview) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Tooltip title="No longer interested">
          <Box sx={actionCellSx}>
            <IconButton color="error" size="large" onClick={onNoLongerInterested} aria-label="No longer interested">
              <ThumbDownAltIcon fontSize="large" />
            </IconButton>
          </Box>
        </Tooltip>
        <Tooltip title="Skip">
          <Box sx={actionCellSx}>
            <IconButton size="large" onClick={onSkip} aria-label="Skip">
              <SkipNextIcon fontSize="large" />
            </IconButton>
          </Box>
        </Tooltip>
        <Tooltip title="Still interested">
          <Box sx={actionCellSx}>
            <IconButton color="success" size="large" onClick={onStillInterested} aria-label="Still interested">
              <ThumbUpAltIcon fontSize="large" />
            </IconButton>
          </Box>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Tooltip title="Pass">
        <Box sx={actionCellSx}>
          <IconButton size="large" onClick={onPass} aria-label="Pass">
            <SkipNextIcon fontSize="large" />
          </IconButton>
        </Box>
      </Tooltip>
      <Tooltip title="Like">
        <Box sx={actionCellSx}>
          <IconButton color="success" size="large" onClick={onLike} aria-label="Like">
            <ThumbUpAltIcon fontSize="large" />
          </IconButton>
        </Box>
      </Tooltip>
      <Tooltip
        title={
          superLikeBlocked
            ? 'Super likes are only for books not yet in the backlog'
            : remainingSuperLikes === 0
              ? 'No super-likes left'
              : 'Super-like'
        }
      >
        <Box sx={actionCellSx}>
          <span>
            <IconButton
              color="error"
              size="large"
              onClick={onSuperLike}
              disabled={superLikeBlocked || remainingSuperLikes === 0}
              aria-label={`Super-like, ${remainingSuperLikes} remaining`}
            >
              <Badge
                badgeContent={remainingSuperLikes}
                overlap="rectangular"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: 'background.paper',
                    color: 'error.main',
                    border: (theme) => `2px solid ${theme.palette.error.main}`,
                    boxShadow: 1,
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    fontFamily: (theme) => theme.typography.fontFamily,
                    lineHeight: 1,
                    minWidth: 22,
                    height: 22,
                    px: 0.5,
                    py: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontVariantNumeric: 'tabular-nums',
                    // Neutralize default badge line-box / baseline shift so the digit sits dead center
                    '& > *': { lineHeight: 1 },
                  },
                }}
              >
                <FavoriteIcon fontSize="large" />
              </Badge>
            </IconButton>
          </span>
        </Box>
      </Tooltip>
      <Tooltip title="Bookmark">
        <Box sx={actionCellSx}>
          <IconButton color="info" size="large" onClick={onBookmark} aria-label="Bookmark">
            <BookmarkIcon fontSize="large" />
          </IconButton>
        </Box>
      </Tooltip>
    </Box>
  );
};

export default ActionBar;
