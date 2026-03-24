import React, { useState } from 'react';
import { Alert, AlertTitle, IconButton, Box, Button } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import { requestPermissionAndSubscribe } from 'services/notifications/notifications.service';
import { useSubscriptionStatus } from 'hooks/useSubscriptionStatus';
import { useQueryClient } from '@tanstack/react-query';
import { isNativeApp } from 'utils/platformHelpers';

const NotificationPrompt = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: subscriptions, isLoading: checking } = useSubscriptionStatus(user?.uid);
  const hasSubscription = !!(subscriptions && subscriptions.length > 0);
  const dismissedFromStorage = typeof window !== 'undefined' ? localStorage.getItem('notification-prompt-dismissed') : null;
  const [promptDismissed, setPromptDismissed] = useState(false);
  const showPrompt = !hasSubscription && !dismissedFromStorage && !promptDismissed;

  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState(null);

  const handleDismiss = () => {
    setPromptDismissed(true);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  const requestPermission = async () => {
    if (!user?.uid) return;

    try {
      setRequesting(true);
      setError(null);
      const result = await requestPermissionAndSubscribe(user.uid);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['subscription', user.uid] });
      } else {
        setError(result.error || 'Failed to enable notifications');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError(err.message || 'Failed to enable notifications');
    } finally {
      setRequesting(false);
    }
  };

  // Don't show if checking, already subscribed, or already dismissed
  if (checking || hasSubscription || !showPrompt) {
    return null;
  }

  // Check if notifications are supported (native app or web with PushManager)
  const pushSupported = isNativeApp() ||
    (('Notification' in window) && ('serviceWorker' in navigator) && ('PushManager' in window));
  if (!pushSupported) {
    return null;
  }

  // Check if permission was already denied (Notification may be undefined in native WebView)
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    return null;
  }

  return (
    <Alert
      severity="info"
      action={
        <IconButton
          aria-label="close"
          color="inherit"
          size="small"
          onClick={handleDismiss}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      }
      sx={{ mb: 2 }}
    >
      <AlertTitle>Enable Push Notifications</AlertTitle>
      Get reminded about your daily goals and upcoming book club meetings.
      {error && (
        <Box sx={{ mt: 1, mb: 1, color: 'error.main', fontSize: '0.875rem' }}>
          {error}
        </Box>
      )}
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          onClick={requestPermission}
          disabled={requesting}
          size="small"
        >
          {requesting ? 'Enabling...' : 'Enable Notifications'}
        </Button>
      </Box>
    </Alert>
  );
};

export default NotificationPrompt;

