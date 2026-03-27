import React from 'react';
import {
  Box,
  Button,
  Modal,
  Paper,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getPlatform } from 'utils/platformHelpers';
import { triggerHaptic } from 'utils/haptics';
import {
  liquidGlassBackdropSx,
  liquidGlassModalContainerSx,
  liquidGlassPaperSx,
  liquidGlassPrimaryButtonSx,
  liquidGlassSecondaryButtonSx,
} from 'utils/liquidGlassDialogStyles';

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
          sx: liquidGlassBackdropSx,
        },
      }}
      sx={liquidGlassModalContainerSx}
    >
      <Paper elevation={0} sx={liquidGlassPaperSx}>
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
            sx={liquidGlassSecondaryButtonSx(theme)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleConfirm}
            disabled={confirmDisabled}
            color={destructive ? 'error' : 'primary'}
            sx={liquidGlassPrimaryButtonSx}
          >
            {confirmLabel}
          </Button>
        </Box>
      </Paper>
    </Modal>
  );
};

export default IOSConfirmDialog;
