import React, { useState, useEffect } from 'react';
import { Button, Alert, Box, Typography } from '@mui/material';
import { subscribeToNotifications } from 'services/notifications/notifications.service';
import { useAuth } from 'AuthContext';

const NotificationPermission = ({ onSubscribed }) => {
  const { user } = useAuth();
  const [permission, setPermission] = useState(Notification.permission);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

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
      setPermission(permissionResult);

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
        if (onSubscribed) {
          onSubscribed();
        }
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
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (permission === 'granted') {
    return (
      <Alert severity="success" sx={{ mt: 2 }}>
        Notifications are enabled
      </Alert>
    );
  }

  if (permission === 'denied') {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Notifications are blocked. Please enable them in your browser settings.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Button
        variant="contained"
        onClick={requestPermission}
        disabled={requesting}
      >
        {requesting ? 'Enabling...' : 'Enable Notifications'}
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Enable push notifications to receive reminders about your daily goals and upcoming meetings.
      </Typography>
    </Box>
  );
};

export default NotificationPermission;

