import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';

/**
 * Full-card tint while dragging: right=like, left=pass, up=super, down=bookmark.
 */
const SwipeOverlay = ({ direction, strength }) => {
  const s = Math.min(1, Math.max(0, strength || 0));
  if (!direction || s < 0.05) {
    return null;
  }

  const config = {
    right: {
      label: 'Like',
      icon: ThumbUpAltIcon,
      paletteKey: 'success',
    },
    left: {
      label: 'Pass',
      icon: SkipNextIcon,
      paletteKey: 'grey',
    },
    up: {
      label: 'Super',
      icon: FavoriteIcon,
      paletteKey: 'error',
    },
    down: {
      label: 'Bookmark',
      icon: BookmarkIcon,
      paletteKey: 'info',
    },
  };

  const c = config[direction];
  if (!c) return null;
  const Icon = c.icon;

  return (
    <Box
      sx={(theme) => {
        const main =
          c.paletteKey === 'grey'
            ? theme.palette.grey[700]
            : theme.palette[c.paletteKey].main;
        return {
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 1.5,
          pointerEvents: 'none',
          borderRadius: 3,
          opacity: s,
          bgcolor: alpha(main, 0.82),
          color: theme.palette.common.white,
          textShadow: '0 1px 2px rgba(0,0,0,0.35)',
        };
      }}
    >
      <Icon sx={{ fontSize: 56 }} />
      <Typography variant="h6" fontWeight={800} sx={{ color: 'inherit', letterSpacing: 0.02 }}>
        {c.label}
      </Typography>
    </Box>
  );
};

export default SwipeOverlay;
