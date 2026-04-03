import React, { useState, useCallback, useRef } from 'react';
import { Button, Menu, MenuItem, Typography, Box } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { SWIPE_QUEUES, getSwipeQueueMeta } from 'constants/swipeQueues';

const QueueSelector = ({ activeQueue, onSelect }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  /** Horizontally centered on the viewport; vertically just below the header trigger. */
  const openCentered = useCallback(() => {
    const left = Math.round(window.innerWidth / 2);
    let top = 96;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      top = Math.round(rect.bottom + 8);
    }
    setAnchorPosition({ top, left });
    setMenuOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const current = getSwipeQueueMeta(activeQueue);

  return (
    <Box ref={triggerRef} sx={{ textAlign: 'center' }}>
      <Button
        color="inherit"
        onClick={openCentered}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        <Box component="span" sx={{ mr: 0.75 }}>
          {current.emoji}
        </Box>
        {current.label}
      </Button>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -0.5 }}>
        {current.hint}
      </Typography>
      <Menu
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        open={menuOpen}
        onClose={handleClose}
        slotProps={{
          root: {
            sx: {
              // Same stacking context as SwipeDiscoverInfoDialog — Discover shell is zIndex.modal + 2.
              zIndex: (theme) => theme.zIndex.modal + 10,
            },
          },
          paper: {
            sx: {
              minWidth: 280,
              maxWidth: 'min(92vw, 360px)',
            },
          },
        }}
      >
        {SWIPE_QUEUES.map((q) => (
          <MenuItem
            key={q.id}
            selected={q.id === activeQueue}
            onClick={() => {
              onSelect(q.id);
              handleClose();
            }}
            sx={{ py: 1.25, alignItems: 'flex-start' }}
          >
            <Typography
              component="span"
              aria-hidden
              sx={{
                fontSize: '1.35rem',
                lineHeight: 1.2,
                mr: 1.25,
                mt: 0.15,
                flexShrink: 0,
              }}
            >
              {q.emoji}
            </Typography>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600}>
                {q.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {q.hint}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default QueueSelector;
