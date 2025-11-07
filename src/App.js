import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ErrorNotificationProvider, useErrorNotification } from './contexts/ErrorNotification';
import { setGlobalErrorHandler } from './services/apiHelpers';
import Dashboard from './views/Dashboard';
import ClubView from './views/ClubView';
import Books from './views/Books';
import Calendar from './views/Calendar';
import Goals from './views/Goals';
import Login from './Login';
import { CircularProgress, Box } from '@mui/material';

function AppContent() {
  const { user, loading } = useAuth();
  const { showError } = useErrorNotification();

  // Set global error handler for API service
  useEffect(() => {
    setGlobalErrorHandler(showError);
  }, [showError]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/club" element={<ClubView />} />
        <Route path="/books" element={<Books />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ErrorNotificationProvider>
        <AppContent />
      </ErrorNotificationProvider>
    </AuthProvider>
  );
}

export default App;
