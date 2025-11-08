import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertTitle, IconButton, Box, Button } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import { getSubscriptionStatus, subscribeToNotifications } from 'services/notifications/notifications.service';

const NotificationPrompt = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [checking, setChecking] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState(null);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    try {
      const subscriptions = await getSubscriptionStatus(user.uid);
      const subscribed = subscriptions && subscriptions.length > 0;
      setHasSubscription(subscribed);
      
      // Check if already dismissed
      const dismissed = localStorage.getItem('notification-prompt-dismissed');
      
      // Only show if not subscribed and not dismissed
      if (!subscribed && !dismissed) {
        setShowPrompt(true);
      }
    } catch (err) {
      console.error('Error checking subscription status:', err);
    } finally {
      setChecking(false);
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  const requestPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setError('Notifications are not supported in this browser');
      return;
    }

    if (!('PushManager' in window)) {
      setError('Push notifications are not supported in this browser');
      return;
    }

    try {
      setRequesting(true);
      setError(null);

      // Request notification permission
      const permissionResult = await Notification.requestPermission();

      if (permissionResult !== 'granted') {
        setError('Notification permission was denied');
        setRequesting(false);
        return;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.ready;
      if (!registration) {
        registration = await navigator.serviceWorker.register('/service-worker.js');
      }

      // Get VAPID public key
      const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setError('VAPID public key is not configured. Please contact support.');
        setRequesting(false);
        return;
      }

      // Get push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to backend
      if (user) {
        await subscribeToNotifications(user.uid, subscription.toJSON());
        setShowPrompt(false);
        setHasSubscription(true);
        // Don't mark as dismissed if they subscribed - they might want to see it again if they unsubscribe
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError(err.message || 'Failed to enable notifications');
    } finally {
      setRequesting(false);
    }
  };

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Don't show if checking, already subscribed, or already dismissed
  if (checking || hasSubscription || !showPrompt) {
    return null;
  }

  // Check if notifications are supported
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  // Check if permission was already denied
  if (Notification.permission === 'denied') {
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

