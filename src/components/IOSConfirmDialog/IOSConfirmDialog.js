import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Modal,
  Paper,
  Typography,
  Divider,
  Box,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { getPlatform } from 'utils/platformHelpers';
import { triggerHaptic } from 'utils/haptics';

/**
 * Confirmation dialog: iOS UIAlert-style on Capacitor iOS, standard MUI Dialog elsewhere.
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
  const isIosNative = getPlatform() === 'ios';

  const handleCancel = () => {
    if (isIosNative) triggerHaptic('light');
    onClose?.();
  };

  const handleConfirm = () => {
    if (isIosNative) triggerHaptic('light');
    onConfirm?.();
  };

  if (!isIosNative) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        aria-labelledby="ios-confirm-fallback-title"
        aria-describedby="ios-confirm-fallback-desc"
      >
        <DialogTitle id="ios-confirm-fallback-title">{title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="ios-confirm-fallback-desc">{description}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>{cancelLabel}</Button>
          <Button
            onClick={handleConfirm}
            color={destructive ? 'error' : 'primary'}
            variant={destructive ? 'contained' : 'text'}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      closeAfterTransition
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: alpha('#000000', 0.32),
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          },
        },
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2.5,
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: '100%',
          maxWidth: 270,
          borderRadius: '14px',
          overflow: 'hidden',
          textAlign: 'center',
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.94) : alpha('#f2f2f7', 0.94),
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        }}
      >
        <Box sx={{ px: 2, pt: 2.5, pb: 2 }}>
          <Typography
            id="ios-confirm-title"
            sx={{
              fontWeight: 600,
              fontSize: '1.0625rem',
              lineHeight: 1.3,
              mb: description ? 0.75 : 0,
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
                color: 'text.secondary',
                fontSize: '0.8125rem',
                lineHeight: 1.35,
              }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>

        <Divider sx={{ borderColor: (theme) => alpha(theme.palette.divider, 0.5) }} />

        <Button
          fullWidth
          onClick={handleConfirm}
          disabled={confirmDisabled}
          sx={{
            py: 1.35,
            borderRadius: 0,
            textTransform: 'none',
            fontSize: '1.0625rem',
            fontWeight: 600,
            color: destructive ? '#ff3b30' : '#007aff',
            '&:disabled': { color: 'action.disabled' },
          }}
        >
          {confirmLabel}
        </Button>

        <Divider sx={{ borderColor: (theme) => alpha(theme.palette.divider, 0.5) }} />

        <Button
          fullWidth
          onClick={handleCancel}
          sx={{
            py: 1.35,
            borderRadius: 0,
            textTransform: 'none',
            fontSize: '1.0625rem',
            fontWeight: 600,
            color: '#007aff',
          }}
        >
          {cancelLabel}
        </Button>
      </Paper>
    </Modal>
  );
};

export default IOSConfirmDialog;
