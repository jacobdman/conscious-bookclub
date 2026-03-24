import React, { useState, useCallback } from 'react';
import { Snackbar, Alert, useMediaQuery, useTheme } from '@mui/material';
import ErrorNotificationContext from './ErrorNotificationContext';

// ******************STATE VALUES**********************
const ErrorNotificationProvider = (props) => {
  const children = props?.children;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  // ******************EFFECTS/REACTIONS**********************

  // ******************SETTERS**********************
  const showError = useCallback((message) => {
    setError(message);
    setOpen(true);
  }, []);

  const handleClose = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    // Clear error message after snackbar closes
    setTimeout(() => setError(null), 300);
  }, []);

  // ******************COMPUTED VALUES**********************

  // ******************UTILITY FUNCTIONS**********************

  // ******************LOAD FUNCTIONS**********************

  // ******************EXPORTS**********************
  return (
    <ErrorNotificationContext.Provider value={{ showError }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={
          isMobile
            ? { vertical: 'top', horizontal: 'center' }
            : { vertical: 'bottom', horizontal: 'center' }
        }
        sx={
          isMobile
            ? { '&.MuiSnackbar-root': { top: 'calc(env(safe-area-inset-top) + 8px)' } }
            : undefined
        }
      >
        <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </ErrorNotificationContext.Provider>
  );
};

export const useErrorNotification = () => {
  const context = React.useContext(ErrorNotificationContext);
  if (!context) {
    throw new Error('useErrorNotification must be used within ErrorNotificationProvider');
  }
  return context;
};

export default ErrorNotificationProvider;

