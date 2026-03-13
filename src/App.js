import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AuthProvider, useAuth } from './AuthContext';
import { ErrorNotificationProvider, useErrorNotification } from './contexts/ErrorNotification';
import ClubProvider from './contexts/Club/ClubProvider';
import FeedProvider from './contexts/Feed/FeedProvider';
import { setGlobalErrorHandler } from './services/apiHelpers';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './views/Dashboard';
import Feed from './views/Feed';
import ClubManagement from './views/ClubManagement';
import Books from './views/Books';
import Calendar from './views/Calendar';
import Goals from './views/Goals';
import Profile from './views/Profile';
import Meetings from './views/Meetings';
import NoClub from './views/NoClub';
import ClubSetup from './views/ClubSetup';
import Landing from './views/Landing';
import Theory from './views/Theory';
import Themes from './views/Themes';
import Quotes from './views/Quotes';
import Dev from './views/Dev';
import Login from './Login';
import UpdatePrompt from 'components/UpdatePrompt';
import BackButtonHandler from 'components/BackButtonHandler';
import FeatureGateRoute from 'components/FeatureGateRoute';
import TutorialProvider from 'contexts/Tutorial/TutorialProvider';
import KeyboardProvider from 'contexts/Keyboard';
import { CircularProgress, Box } from '@mui/material';
import { queryClient, persistOptions } from './queryClient';
import { initCapacitorNative } from 'utils/capacitorNative';

function AppContent() {
  const { user, loading } = useAuth();
  const { showError } = useErrorNotification();

  // Set global error handler for API service
  useEffect(() => {
    setGlobalErrorHandler(showError);
  }, [showError]);

  // Capacitor native: init status bar, keyboard, splash when app is ready
  useEffect(() => {
    if (!loading) {
      initCapacitorNative();
    }
  }, [loading]);

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

  return (
    <KeyboardProvider>
      <Router>
        <BackButtonHandler />
        <Routes>
        {/* Public routes */}
        <Route
          path="/landing"
          element={<Landing />}
        />
        <Route
          path="/theory"
          element={<Theory />}
        />
        <Route
          path="/themes"
          element={<Themes />}
        />
        <Route
          path="/dev"
          element={<Dev />}
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        
        {/* Authenticated routes */}
        {user ? (
          <>
            <Route
              path="/join-club"
              element={
                <NoClub />
              }
            />
            <Route
              path="/setup/create-club"
              element={
                <ClubSetup />
              }
            />
            <Route element={<FeedProvider><Outlet /></FeedProvider>}>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feed"
                element={
                  <ProtectedRoute>
                    <Feed />
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
                    <FeatureGateRoute featureKey="books">
                      <Books />
                    </FeatureGateRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/books/club"
                element={
                  <ProtectedRoute>
                    <FeatureGateRoute featureKey="books">
                      <Books />
                    </FeatureGateRoute>
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
                    <FeatureGateRoute featureKey="goals">
                      <Goals />
                    </FeatureGateRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/goals/club"
                element={
                  <ProtectedRoute>
                    <FeatureGateRoute featureKey="goals">
                      <Goals />
                    </FeatureGateRoute>
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
              <Route
                path="/quotes"
                element={
                  <ProtectedRoute>
                    <FeatureGateRoute featureKey="quotes">
                      <Quotes />
                    </FeatureGateRoute>
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/landing" replace />} />
        )}
      </Routes>
      </Router>
    </KeyboardProvider>
  );
}

const QueryProvider = persistOptions
  ? ({ children }) => (
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        {children}
      </PersistQueryClientProvider>
    )
  : ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

function App() {
  return (
    <AuthProvider>
      <ErrorNotificationProvider>
        <QueryProvider>
          <TutorialProvider>
            <ClubProvider>
              <AppContent />
            </ClubProvider>
            <UpdatePrompt />
          </TutorialProvider>
        </QueryProvider>
      </ErrorNotificationProvider>
    </AuthProvider>
  );
}

export default App;
