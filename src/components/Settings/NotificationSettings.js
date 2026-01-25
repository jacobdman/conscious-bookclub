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
  RadioGroup,
  Radio,
  Divider,
  Checkbox,
} from '@mui/material';
// Context
import { useAuth } from 'AuthContext';
// Components
import NotificationPermission from 'components/NotificationPermission';
// Services
import { getUserDocument, updateNotificationPreferences } from 'services/users/users.service';
import { getSubscriptionStatus, sendTestNotification, subscribeToNotifications } from 'services/notifications/notifications.service';

const NotificationSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  // Goal notifications
  const [goalNotificationsEnabled, setGoalNotificationsEnabled] = useState(false);
  const [notificationHour, setNotificationHour] = useState(9); // Default to 9 AM
  
  // Feed notifications
  const [feedNotificationsEnabled, setFeedNotificationsEnabled] = useState(false);
  const [feedNotificationMode, setFeedNotificationMode] = useState('all'); // 'all' or 'mentions_replies'
  
  // Meeting notifications
  const [meetingNotificationsEnabled, setMeetingNotificationsEnabled] = useState(false);
  const [meetingOneWeekBefore, setMeetingOneWeekBefore] = useState(false);
  const [meetingOneDayBefore, setMeetingOneDayBefore] = useState(false);
  
  const [timezone, setTimezone] = useState('UTC');
  const [hasSubscription, setHasSubscription] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [reRequesting, setReRequesting] = useState(false);

  const loadUserPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await getUserDocument(user.uid);
      
      // Load from notificationSettings JSON if available, otherwise fall back to legacy fields
      const settings = userData.notificationSettings || {};
      
      // Goal notifications
      const goalSettings = settings.goals || {};
      setGoalNotificationsEnabled(goalSettings.enabled || userData.dailyGoalNotificationsEnabled || false);
      
      if (goalSettings.time) {
        const [hours] = goalSettings.time.split(':').map(Number);
        setNotificationHour(hours || 9);
      } else if (userData.dailyGoalNotificationTime) {
        const [hours] = userData.dailyGoalNotificationTime.split(':').map(Number);
        setNotificationHour(hours || 9);
      } else {
        setNotificationHour(9);
      }
      
      // Feed notifications
      const feedSettings = settings.feed || {};
      setFeedNotificationsEnabled(feedSettings.enabled || false);
      setFeedNotificationMode(feedSettings.mode || 'all');
      
      // Meeting notifications
      const meetingSettings = settings.meetings || {};
      setMeetingNotificationsEnabled(meetingSettings.enabled || false);
      setMeetingOneWeekBefore(meetingSettings.oneWeekBefore || false);
      setMeetingOneDayBefore(meetingSettings.oneDayBefore || false);

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
      // Check notification permission status
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
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

      // Build notification_settings JSON structure
      const notification_settings = {
        goals: {
          enabled: goalNotificationsEnabled,
          time: timeStr,
        },
        feed: {
          enabled: feedNotificationsEnabled,
          mode: feedNotificationMode,
        },
        meetings: {
          enabled: meetingNotificationsEnabled,
          oneWeekBefore: meetingOneWeekBefore,
          oneDayBefore: meetingOneDayBefore,
        },
      };

      await updateNotificationPreferences(user.uid, {
        notification_settings,
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

  const handleSubscribed = async () => {
    await checkSubscriptionStatus();
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    
    // If user just subscribed and has no notification types enabled, enable all by default
    const hasAnyEnabled = goalNotificationsEnabled || 
                          feedNotificationsEnabled || 
                          meetingNotificationsEnabled;
    
    if (!hasAnyEnabled) {
      // Enable all notification types with sensible defaults
      setGoalNotificationsEnabled(true);
      setFeedNotificationsEnabled(true);
      setFeedNotificationMode('all');
      setMeetingNotificationsEnabled(true);
      setMeetingOneWeekBefore(true);
      setMeetingOneDayBefore(true);
      
      // Auto-save the preferences
      try {
        const hourStr = String(notificationHour).padStart(2, '0');
        const timeStr = `${hourStr}:00:00`;
        
        const notification_settings = {
          goals: {
            enabled: true,
            time: timeStr,
          },
          feed: {
            enabled: true,
            mode: 'all',
          },
          meetings: {
            enabled: true,
            oneWeekBefore: true,
            oneDayBefore: true,
          },
        };
        
        await updateNotificationPreferences(user.uid, {
          notification_settings,
          timezone: timezone,
        });
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        console.error('Error auto-enabling notification preferences:', err);
        // Don't show error to user, just log it
      }
    }
  };

  const handleReRequestPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Push notifications are not supported in this browser');
      return;
    }

    try {
      setReRequesting(true);
      setError(null);

      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setNotificationPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Notification permission was denied. Please enable it in your browser settings.');
        setReRequesting(false);
        return;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.ready;
      if (!registration) {
        registration = await navigator.serviceWorker.register('/service-worker.js');
        // Wait for service worker to be ready
        registration = await navigator.serviceWorker.ready;
      }

      // Get VAPID public key
      const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setError('VAPID public key is not configured. Please contact support.');
        setReRequesting(false);
        return;
      }

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

      // Get push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to backend
      if (user) {
        await subscribeToNotifications(user.uid, subscription.toJSON());
        await checkSubscriptionStatus();
        
        // If user just subscribed and has no notification types enabled, enable all by default
        const hasAnyEnabled = goalNotificationsEnabled || 
                              feedNotificationsEnabled || 
                              meetingNotificationsEnabled;
        
        if (!hasAnyEnabled) {
          // Enable all notification types with sensible defaults
          setGoalNotificationsEnabled(true);
          setFeedNotificationsEnabled(true);
          setFeedNotificationMode('all');
          setMeetingNotificationsEnabled(true);
          setMeetingOneWeekBefore(true);
          setMeetingOneDayBefore(true);
          
          // Auto-save the preferences
          try {
            const hourStr = String(notificationHour).padStart(2, '0');
            const timeStr = `${hourStr}:00:00`;
            
            const notification_settings = {
              goals: {
                enabled: true,
                time: timeStr,
              },
              feed: {
                enabled: true,
                mode: 'all',
              },
              meetings: {
                enabled: true,
                oneWeekBefore: true,
                oneDayBefore: true,
              },
            };
            
            await updateNotificationPreferences(user.uid, {
              notification_settings,
              timezone: timezone,
            });
          } catch (err) {
            console.error('Error auto-enabling notification preferences:', err);
            // Don't show error to user, just log it
          }
        }
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error re-requesting notification permission:', err);
      setError(err.message || 'Failed to enable notifications');
    } finally {
      setReRequesting(false);
    }
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

      {/* Goal Notifications Section */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
          Goal Notifications
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={goalNotificationsEnabled}
              onChange={(e) => setGoalNotificationsEnabled(e.target.checked)}
              disabled={saving}
            />
          }
          label="Enable daily goal notifications"
        />

        {goalNotificationsEnabled && (
          <>
            <FormControl fullWidth sx={{ mt: 2 }}>
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

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You will receive a reminder at the top of this hour if you have incomplete daily goals.
            </Typography>
          </>
        )}
      </Box>

      <Divider />

      {/* Feed Notifications Section */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
          Feed Notifications
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={feedNotificationsEnabled}
              onChange={(e) => setFeedNotificationsEnabled(e.target.checked)}
              disabled={saving}
            />
          }
          label="Enable feed notifications"
        />

        {feedNotificationsEnabled && (
          <>
            <FormControl component="fieldset" sx={{ mt: 2 }}>
              <RadioGroup
                value={feedNotificationMode}
                onChange={(e) => setFeedNotificationMode(e.target.value)}
              >
                <FormControlLabel
                  value="all"
                  control={<Radio />}
                  label="All posts"
                  disabled={saving}
                />
                <FormControlLabel
                  value="mentions_replies"
                  control={<Radio />}
                  label="Mentions & replies only"
                  disabled={saving}
                />
              </RadioGroup>
            </FormControl>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {feedNotificationMode === 'all' 
                ? 'You will receive notifications for all new posts in your book club.'
                : 'You will receive notifications when someone replies to your posts.'}
            </Typography>
          </>
        )}
      </Box>

      <Divider />

      {/* Meeting Notifications Section */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
          Meeting Notifications
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={meetingNotificationsEnabled}
              onChange={(e) => setMeetingNotificationsEnabled(e.target.checked)}
              disabled={saving}
            />
          }
          label="Enable meeting notifications"
        />

        {meetingNotificationsEnabled && (
          <>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={meetingOneWeekBefore}
                    onChange={(e) => setMeetingOneWeekBefore(e.target.checked)}
                    disabled={saving}
                  />
                }
                label="Notify 1 week before meeting"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={meetingOneDayBefore}
                    onChange={(e) => setMeetingOneDayBefore(e.target.checked)}
                    disabled={saving}
                  />
                }
                label="Notify 1 day before meeting"
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You will receive reminders before upcoming book club meetings.
            </Typography>
          </>
        )}
      </Box>

      <Divider />

      {/* Push Notification Status */}
      {!hasSubscription && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Push notifications are not enabled. Enable them to receive reminders:
          </Typography>
          <NotificationPermission onSubscribed={handleSubscribed} />
        </Box>
      )}

      {hasSubscription && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Push notifications are enabled
            {notificationPermission !== 'granted' && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Note: Notification permission may need to be re-granted.
              </Typography>
            )}
          </Alert>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={handleTestNotification}
              disabled={testing || saving || reRequesting}
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
            <Button
              variant="outlined"
              color="warning"
              onClick={handleReRequestPermission}
              disabled={testing || saving || reRequesting}
              size="small"
            >
              {reRequesting ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Re-requesting...
                </>
              ) : (
                'Re-request Permission'
              )}
            </Button>
          </Box>
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
