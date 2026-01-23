import React, { useMemo, useState } from 'react';
// UI
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
// Components
import THEME_COLORS from 'components/ClubBooksTab/themeColors';
// Utils
import triggerHaptic from 'utils/haptics';

const DevTools = () => {
  const [toastState, setToastState] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const navigate = useNavigate();
  const muiTheme = useTheme();
  const themeColorEntries = useMemo(() => Object.entries(THEME_COLORS), []);
  const paletteEntries = useMemo(
    () => [
      { label: 'Primary', value: muiTheme?.palette?.primary?.main },
      { label: 'Secondary', value: muiTheme?.palette?.secondary?.main },
      { label: 'Background', value: muiTheme?.palette?.background?.default },
    ],
    [muiTheme]
  );

  const openToast = (severity, message) => {
    setToastState({
      open: true,
      severity,
      message,
    });
  };

  const handleToastClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setToastState((prev) => ({ ...prev, open: false }));
  };

  const handleHaptic = (type) => {
    // eslint-disable-next-line no-console
    console.log(`[dev] haptics: ${type}`);
    triggerHaptic(type);
  };

  const handleRequestNotificationPermission = async () => {
    // eslint-disable-next-line no-console
    console.log('[dev] notifications: request permission');
    if (!('Notification' in window)) {
      // eslint-disable-next-line no-console
      console.log('[dev] notifications: unsupported');
      openToast('warning', 'Notifications are not supported in this browser.');
      return;
    }

    const result = await Notification.requestPermission();
    // eslint-disable-next-line no-console
    console.log('[dev] notifications: permission result', result);
    if (result === 'granted') {
      openToast('success', 'Notification permission granted.');
      return;
    }

    if (result === 'denied') {
      openToast('warning', 'Notification permission denied.');
      return;
    }

    openToast('info', 'Notification permission dismissed.');
  };

  const handleTestNotification = () => {
    // eslint-disable-next-line no-console
    console.log('[dev] notifications: send test');
    if (!('Notification' in window)) {
      // eslint-disable-next-line no-console
      console.log('[dev] notifications: unsupported');
      openToast('warning', 'Notifications are not supported in this browser.');
      return;
    }

    if (Notification.permission !== 'granted') {
      // eslint-disable-next-line no-console
      console.log('[dev] notifications: permission not granted');
      openToast('info', 'Grant permission before sending a test notification.');
      return;
    }

    try {
      new Notification('CBC Test Notification', {
        body: 'This is a test notification from /dev.',
      });
      openToast('success', 'Notification sent (check your system).');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('[dev] notifications: error', error);
      openToast('warning', 'Failed to send test notification.');
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="outlined" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </Box>
      <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
        Dev Tools
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
        Quick sanity checks for toasts, theme colors, haptics, and notifications.
      </Typography>

      <Stack spacing={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Toasts
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="contained" color="success" onClick={() => openToast('success', 'Success toast test')}>
              Success
            </Button>
            <Button variant="contained" color="warning" onClick={() => openToast('warning', 'Warning toast test')}>
              Warning
            </Button>
            <Button variant="contained" color="error" onClick={() => openToast('error', 'Error toast test')}>
              Error
            </Button>
            <Button variant="contained" color="info" onClick={() => openToast('info', 'Info toast test')}>
              Info
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Theme Colors
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Palette
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {paletteEntries.map((entry) => {
                  const colorValue = entry.value || '#FFFFFF';
                  return (
                    <Box key={entry.label} sx={{ flex: 1 }}>
                      <Box sx={{ height: 48, borderRadius: 1, bgcolor: colorValue, mb: 1 }} />
                      <Typography variant="body2">
                        {entry.label}: {entry.value || 'N/A'}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Meeting Themes
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {themeColorEntries.map(([label, value]) => (
                  <Box key={label} sx={{ flex: 1 }}>
                    <Box sx={{ height: 48, borderRadius: 1, bgcolor: value, mb: 1 }} />
                    <Typography variant="body2">
                      {label}: {value}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Haptics
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="outlined" onClick={() => handleHaptic('light')}>
              Light
            </Button>
            <Button variant="outlined" onClick={() => handleHaptic('medium')}>
              Medium
            </Button>
            <Button variant="outlined" onClick={() => handleHaptic('heavy')}>
              Heavy
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Notifications
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="contained" onClick={handleRequestNotificationPermission}>
              Request Permission
            </Button>
            <Button variant="outlined" onClick={handleTestNotification}>
              Send Test Notification
            </Button>
          </Stack>
        </Paper>
      </Stack>

      <Snackbar
        open={toastState.open}
        autoHideDuration={4000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleToastClose} severity={toastState.severity} sx={{ width: '100%' }}>
          {toastState.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DevTools;
