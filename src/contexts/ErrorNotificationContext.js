import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const ErrorNotificationContext = createContext({
  showError: () => {},
});

export const ErrorNotificationProvider = ({ children }) => {
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

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

  return (
    <ErrorNotificationContext.Provider value={{ showError }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </ErrorNotificationContext.Provider>
  );
};

export const useErrorNotification = () => {
  const context = useContext(ErrorNotificationContext);
  if (!context) {
    throw new Error('useErrorNotification must be used within ErrorNotificationProvider');
  }
  return context;
};

