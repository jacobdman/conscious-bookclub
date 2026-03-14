import React, { useState, useEffect } from 'react';
import { Button, Alert, Box, Typography } from '@mui/material';
import { requestPermissionAndSubscribe } from 'services/notifications/notifications.service';
import { useAuth } from 'AuthContext';

const NotificationPermission = ({ onSubscribed }) => {
  const { user } = useAuth();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!user?.uid) return;

    try {
      setRequesting(true);
      setError(null);
      const result = await requestPermissionAndSubscribe(user.uid);
      if (result.success) {
        setPermission('granted');
        if (onSubscribed) onSubscribed();
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

