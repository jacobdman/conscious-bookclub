import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ErrorNotificationProvider, useErrorNotification } from './contexts/ErrorNotification';
import ClubProvider from './contexts/Club/ClubProvider';
import { setGlobalErrorHandler } from './services/apiHelpers';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './views/Dashboard';
import ClubView from './views/ClubView';
import ClubManagement from './views/ClubManagement';
import Books from './views/Books';
import Calendar from './views/Calendar';
import Goals from './views/Goals';
import Profile from './views/Profile';
import Meetings from './views/Meetings';
import NoClub from './views/NoClub';
import Login from './Login';
import UpdatePrompt from 'components/UpdatePrompt';
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
    <ClubProvider>
      <Router>
        <Routes>
          <Route path="/join-club" element={<NoClub />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/club"
            element={
              <ProtectedRoute>
                <ClubView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/club/manage"
            element={
              <ProtectedRoute>
                <ClubManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/books"
            element={
              <ProtectedRoute>
                <Books />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <Goals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meetings"
            element={
              <ProtectedRoute>
                <Meetings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ClubProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ErrorNotificationProvider>
        <AppContent />
        <UpdatePrompt />
      </ErrorNotificationProvider>
    </AuthProvider>
  );
}

export default App;
