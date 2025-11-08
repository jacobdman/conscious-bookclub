import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useAuth } from 'AuthContext';
import { getUserDocument, updateNotificationPreferences } from 'services/users/users.service';
import { getSubscriptionStatus, sendTestNotification } from 'services/notifications/notifications.service';
import NotificationPermission from 'components/NotificationPermission';

const NotificationSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationHour, setNotificationHour] = useState(9); // Default to 9 AM
  const [timezone, setTimezone] = useState('UTC');
  const [hasSubscription, setHasSubscription] = useState(false);

  const loadUserPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await getUserDocument(user.uid);
      
      setNotificationsEnabled(userData.dailyGoalNotificationsEnabled || false);
      
      if (userData.dailyGoalNotificationTime) {
        // Parse time string (HH:MM:SS or HH:MM) to get hour
        const timeStr = userData.dailyGoalNotificationTime;
        const [hours] = timeStr.split(':').map(Number);
        setNotificationHour(hours || 9);
      } else {
        // Default to 9 AM
        setNotificationHour(9);
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

      // Format hour as "HH:00:00" (always at minute 0 since cron runs hourly)
      const hourStr = String(notificationHour).padStart(2, '0');
      const timeStr = `${hourStr}:00:00`;

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

  const handleTestNotification = async () => {
    if (!user) return;

    try {
      setTesting(true);
      setTestResult(null);
      setError(null);

      const result = await sendTestNotification(
        user.uid,
        'Test Notification',
        'This is a test push notification from Conscious Book Club!'
      );

      setTestResult(result);
    } catch (err) {
      console.error('Error sending test notification:', err);
      setError(err.message || 'Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Generate hour options with 12-hour format display
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour24 = i;
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 < 12 ? 'AM' : 'PM';
    return {
      value: hour24,
      label: `${hour12} ${ampm}`,
    };
  });

  return (
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
          <FormControl fullWidth>
            <InputLabel id="notification-hour-label">Daily reminder hour</InputLabel>
            <Select
              labelId="notification-hour-label"
              id="notification-hour"
              value={notificationHour}
              label="Daily reminder hour"
              onChange={(e) => setNotificationHour(e.target.value)}
              disabled={saving}
            >
              {hourOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary">
            You will receive a reminder at the top of this hour if you have incomplete daily goals.
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
              <Box sx={{ mt: 1 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Push notifications are enabled
                </Alert>
                <Button
                  variant="outlined"
                  onClick={handleTestNotification}
                  disabled={testing || saving}
                  size="small"
                >
                  {testing ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Sending...
                    </>
                  ) : (
                    'Send Test Notification'
                  )}
                </Button>
                {testResult && (
                  <Alert 
                    severity={testResult.failed === 0 ? "success" : "warning"} 
                    sx={{ mt: 2 }}
                    onClose={() => setTestResult(null)}
                  >
                    {testResult.message}
                  </Alert>
                )}
              </Box>
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
  );
};

export default NotificationSettings;

