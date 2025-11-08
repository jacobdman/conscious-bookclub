import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Button,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from 'AuthContext';
import { getUserDocument, updateNotificationPreferences } from 'services/users/users.service';
import { getSubscriptionStatus } from 'services/notifications/notifications.service';
import NotificationPermission from 'components/NotificationPermission';
import { format } from 'date-fns';

const NotificationSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState(null);
  const [timezone, setTimezone] = useState('UTC');
  const [hasSubscription, setHasSubscription] = useState(false);

  const loadUserPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await getUserDocument(user.uid);
      
      setNotificationsEnabled(userData.dailyGoalNotificationsEnabled || false);
      
      if (userData.dailyGoalNotificationTime) {
        // Parse time string (HH:MM:SS or HH:MM) to Date object
        const timeStr = userData.dailyGoalNotificationTime;
        const [hours, minutes] = timeStr.split(':').map(Number);
        const timeDate = new Date();
        timeDate.setHours(hours, minutes || 0, 0, 0);
        setNotificationTime(timeDate);
      } else {
        // Default to 9 AM
        const defaultTime = new Date();
        defaultTime.setHours(9, 0, 0, 0);
        setNotificationTime(defaultTime);
      }

      if (userData.timezone) {
        setTimezone(userData.timezone);
      }
    } catch (err) {
      console.error('Error loading user preferences:', err);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const subscriptions = await getSubscriptionStatus(user.uid);
      setHasSubscription(subscriptions && subscriptions.length > 0);
    } catch (err) {
      console.error('Error checking subscription status:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserPreferences();
      checkSubscriptionStatus();
      // Detect timezone
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [user, loadUserPreferences, checkSubscriptionStatus]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const timeStr = notificationTime 
        ? format(notificationTime, 'HH:mm:ss')
        : '09:00:00';

      await updateNotificationPreferences(user.uid, {
        dailyGoalNotificationsEnabled: notificationsEnabled,
        dailyGoalNotificationTime: timeStr,
        timezone: timezone,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError(err.message || 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribed = () => {
    checkSubscriptionStatus();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6">Notification Settings</Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(false)}>
            Notification preferences saved successfully
          </Alert>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              disabled={saving}
            />
          }
          label="Enable daily goal notifications"
        />

        {notificationsEnabled && (
          <>
            <TimePicker
              label="Daily reminder time"
              value={notificationTime}
              onChange={(newValue) => setNotificationTime(newValue)}
              disabled={saving}
              slotProps={{
                textField: {
                  fullWidth: true,
                },
              }}
            />

            <Typography variant="body2" color="text.secondary">
              You will receive a reminder at this time if you have incomplete daily goals.
            </Typography>

            {!hasSubscription && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Push notifications are not enabled. Enable them to receive reminders:
                </Typography>
                <NotificationPermission onSubscribed={handleSubscribed} />
              </Box>
            )}

            {hasSubscription && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Push notifications are enabled
              </Alert>
            )}
          </>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Save Preferences'}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default NotificationSettings;

