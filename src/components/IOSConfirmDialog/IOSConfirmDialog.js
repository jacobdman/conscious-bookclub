import React from 'react';
// UI
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
// Utils
import { confirmDialogPrimaryButtonSx, confirmDialogSecondaryButtonSx } from 'theme';
import { triggerHaptic } from 'utils/haptics';
import { getPlatform } from 'utils/platformHelpers';

/**
 * Confirmation dialog with the app-wide glass Dialog shell.
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
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="xs"
      fullWidth
      closeAfterTransition
      aria-labelledby="ios-confirm-title"
      aria-describedby={description ? 'ios-confirm-desc' : undefined}
    >
      <DialogContent sx={{ px: 2.5, pt: 2.75, pb: 2 }}>
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
      </DialogContent>

      <DialogActions
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
          gap: 1.5,
          px: 2.5,
          pt: 2,
          pb: 'max(24px, calc(12px + env(safe-area-inset-bottom, 0px)))',
          flexWrap: 'wrap',
          '& > .MuiButton-root': { m: 0 },
        }}
      >
        <Button
          variant="outlined"
          onClick={handleCancel}
          sx={confirmDialogSecondaryButtonSx(theme)}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={handleConfirm}
          disabled={confirmDisabled}
          color={destructive ? 'error' : 'primary'}
          sx={confirmDialogPrimaryButtonSx}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IOSConfirmDialog;
