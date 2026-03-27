import React from 'react';
import {
  Box,
  Button,
  Modal,
  Paper,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { getPlatform } from 'utils/platformHelpers';
import { triggerHaptic } from 'utils/haptics';

const glassBackdropSx = (theme) => ({
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.black, 0.48)
      : alpha(theme.palette.common.black, 0.22),
  backdropFilter: 'blur(28px) saturate(175%)',
  WebkitBackdropFilter: 'blur(28px) saturate(175%)',
});

const glassPaperSx = (theme) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    width: '100%',
    maxWidth: 380,
    borderRadius: 3,
    overflow: 'hidden',
    textAlign: 'left',
    backgroundColor: isDark
      ? alpha(theme.palette.background.paper, 0.42)
      : alpha(theme.palette.background.paper, 0.52),
    backdropFilter: 'blur(52px) saturate(200%)',
    WebkitBackdropFilter: 'blur(52px) saturate(200%)',
    border: `1px solid ${
      isDark
        ? alpha(theme.palette.common.white, 0.14)
        : alpha(theme.palette.common.white, 0.55)
    }`,
    boxShadow:
      theme.palette.mode === 'dark'
        ? `0 24px 64px ${alpha(theme.palette.common.black, 0.45)}`
        : `0 20px 56px ${alpha(theme.palette.common.black, 0.1)}, 0 0 0 1px ${alpha(theme.palette.common.black, 0.04)}`,
  };
};

/**
 * Confirmation dialog with a shared liquid-glass shell on all platforms.
 * iOS native builds still get light haptic feedback on actions.
 */
const IOSConfirmDialog = ({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmDisabled = false,
  destructive = false,
}) => {
  const theme = useTheme();
  const isIosNative = getPlatform() === 'ios';

  const handleCancel = () => {
    if (isIosNative) triggerHaptic('light');
    onClose?.();
  };

  const handleConfirm = () => {
    if (isIosNative) triggerHaptic('light');
    onConfirm?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      closeAfterTransition
      aria-labelledby="ios-confirm-title"
      aria-describedby={description ? 'ios-confirm-desc' : undefined}
      slotProps={{
        backdrop: {
          sx: glassBackdropSx,
        },
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pl: 'max(20px, env(safe-area-inset-left, 0px))',
        pr: 'max(20px, env(safe-area-inset-right, 0px))',
        py: 2.5,
        pt: 'max(20px, env(safe-area-inset-top, 0px))',
        pb: 'max(20px, env(safe-area-inset-bottom, 0px))',
        outline: 0,
      }}
    >
      <Paper elevation={0} sx={glassPaperSx}>
        <Box sx={{ px: 2.5, pt: 2.75, pb: description ? 0.5 : 2 }}>
          <Typography
            id="ios-confirm-title"
            component="h2"
            sx={{
              fontWeight: 700,
              fontSize: '1.125rem',
              lineHeight: 1.35,
              letterSpacing: '-0.01em',
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
          {description ? (
            <Typography
              id="ios-confirm-desc"
              variant="body2"
              sx={{
                mt: 1.25,
                color: 'text.secondary',
                fontSize: '0.9375rem',
                lineHeight: 1.5,
              }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'flex-end',
            gap: 1,
            px: 2.5,
            pb: 2.5,
            pt: 1.25,
          }}
        >
          <Button
            variant="outlined"
            onClick={handleCancel}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: 100 },
              py: 1.1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9375rem',
              borderColor: alpha(theme.palette.divider, 0.55),
              color: 'text.primary',
              bgcolor: alpha(theme.palette.action.hover, 0.04),
              backdropFilter: 'blur(8px)',
              '&:hover': {
                borderColor: alpha(theme.palette.divider, 0.85),
                bgcolor: alpha(theme.palette.action.hover, 0.1),
              },
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleConfirm}
            disabled={confirmDisabled}
            color={destructive ? 'error' : 'primary'}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: 108 },
              py: 1.1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9375rem',
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
            }}
          >
            {confirmLabel}
          </Button>
        </Box>
      </Paper>
    </Modal>
  );
};

export default IOSConfirmDialog;
