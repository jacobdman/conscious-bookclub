import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, IconButton, Box } from '@mui/material';
import { Close as CloseIcon, Share as ShareIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { isRunningAsPWA, isMobileDevice, isIOS, isAndroid, getBrowserName, isShareButtonAtTop } from 'utils/pwaHelpers';

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      return;
    }

    // Don't show if already running as PWA
    if (isRunningAsPWA()) {
      return;
    }

    // Only show on mobile devices
    if (!isMobileDevice()) {
      return;
    }

    setShowPrompt(true);

    // Listen for beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) {
    return null;
  }

  const getInstructions = () => {
    if (isIOS()) {
      const browser = getBrowserName();
      const shareButtonLocation = isShareButtonAtTop() ? 'top' : 'bottom';
      const browserName = browser === 'safari' ? 'Safari' : 
                         browser === 'chrome' ? 'Chrome' :
                         browser === 'duckduckgo' ? 'DuckDuckGo' :
                         browser === 'firefox' ? 'Firefox' :
                         browser === 'edge' ? 'Edge' : 'your browser';
      
      return (
        <>
          <AlertTitle>Install App to Home Screen</AlertTitle>
          To install this app on your iOS device:
          <Box component="ol" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
              Tap the Share button{' '}
              <ShareIcon sx={{ fontSize: '1.2em', verticalAlign: 'middle', ml: 0.5 }} />
              {' '}at the {shareButtonLocation} of the screen
              {browser !== 'unknown' && browser !== 'safari' && (
                <Box component="span" sx={{ fontSize: '0.9em', color: 'text.secondary', ml: 0.5 }}>
                  (in {browserName})
                </Box>
              )}
            </Box>
            <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
            <li>Tap <strong>"Add"</strong> in the top right</li>
          </Box>
        </>
      );
    } else if (isAndroid() && deferredPrompt) {
      return (
        <>
          <AlertTitle>Install App to Home Screen</AlertTitle>
          Tap the button below to install this app on your Android device for quick access.
        </>
      );
    } else if (isAndroid()) {
      return (
        <>
          <AlertTitle>Install App to Home Screen</AlertTitle>
          To install this app on your Android device:
          <Box component="ol" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              Tap the menu button{' '}
              <MoreVertIcon sx={{ fontSize: '1.2em', verticalAlign: 'middle', ml: 0.5 }} />
              {' '}in your browser
            </Box>
            <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
            <li>Tap <strong>"Add"</strong> or <strong>"Install"</strong> to confirm</li>
          </Box>
        </>
      );
    }
    return (
      <>
        <AlertTitle>Install App to Home Screen</AlertTitle>
        Add this app to your home screen for quick access and a better experience.
      </>
    );
  };

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
      {getInstructions()}
      {deferredPrompt && (
        <Box sx={{ mt: 1 }}>
          <button
            onClick={handleInstall}
            style={{
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Install Now
          </button>
        </Box>
      )}
    </Alert>
  );
};

export default PWAInstallPrompt;

