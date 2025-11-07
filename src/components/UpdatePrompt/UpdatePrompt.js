import React, { useState, useEffect } from 'react';
import { Snackbar, Alert, Button, Box } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

const UpdatePrompt = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    // Only check in production
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let registration = null;

    const checkForUpdates = async () => {
      try {
        registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
          return;
        }

        // Check for updates periodically
        const checkUpdate = async () => {
          try {
            await registration.update();
          } catch (error) {
            console.error('Error checking for updates:', error);
          }
        };

        // Check immediately
        checkUpdate();

        // Check every 60 seconds
        const intervalId = setInterval(checkUpdate, 60000);

        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                setWaitingWorker(newWorker);
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Listen for controller change (service worker activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // Service worker has been updated and activated
          // Reload the page to get the new version
          window.location.reload();
        });

        return () => {
          clearInterval(intervalId);
        };
      } catch (error) {
        console.error('Error setting up update check:', error);
      }
    };

    checkForUpdates();
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Tell the waiting service worker to skip waiting and activate
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
      // The controllerchange event will trigger a reload
    } else {
      // Fallback: just reload
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  return (
    <Snackbar
      open={updateAvailable}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      onClose={handleDismiss}
    >
      <Alert
        severity="info"
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              color="inherit"
              size="small"
              onClick={handleUpdate}
              startIcon={<RefreshIcon />}
              sx={{ textTransform: 'none' }}
            >
              Update Now
            </Button>
            <Button
              color="inherit"
              size="small"
              onClick={handleDismiss}
              sx={{ textTransform: 'none' }}
            >
              Later
            </Button>
          </Box>
        }
        sx={{ width: '100%' }}
      >
        A new version of the app is available. Update now to get the latest features and improvements.
      </Alert>
    </Snackbar>
  );
};

export default UpdatePrompt;

