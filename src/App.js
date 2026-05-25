import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AuthProvider, useAuth } from './AuthContext';
import { ErrorNotificationProvider, useErrorNotification } from './contexts/ErrorNotification';
import ClubProvider from './contexts/Club/ClubProvider';
import FeedProvider from './contexts/Feed/FeedProvider';
import BooksProvider from './contexts/Books/BooksProvider';
import { setGlobalErrorHandler } from './services/apiHelpers';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './views/Dashboard';
import Feed from './views/Feed';
import ClubManagement from './views/ClubManagement';
import Books from './views/Books';
import SwipeReviewView from './views/SwipeReview';
import Calendar from './views/Calendar';
import Goals from './views/Goals';
import Profile from './views/Profile';
import Meetings from './views/Meetings';
import NoClub from './views/NoClub';
import ClubSetup from './views/ClubSetup';
import SignIn from 'views/SignIn';
import Quotes from './views/Quotes';
import Dev from './views/Dev';
import UpdatePrompt from 'components/UpdatePrompt';
import AprilFools2026 from 'components/AprilFools2026';
import BackButtonHandler from 'components/BackButtonHandler';
import FeatureGateRoute from 'components/FeatureGateRoute';
import TutorialProvider from 'contexts/Tutorial/TutorialProvider';
import KeyboardProvider from 'contexts/Keyboard';
import { CircularProgress, Box } from '@mui/material';
import { queryClient, persistOptions } from './queryClient';
import { initCapacitorNative } from 'utils/capacitorNative';

const RedirectWithSearch = ({ to = '/' }) => {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} replace />;
};

const AuthenticatedHomeRedirect = () => <Navigate to="/" replace />;

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
        {user ? <AprilFools2026 /> : null}
        <BackButtonHandler />
        <Routes>
        {user ? (
          <>
            <Route path="/login" element={<AuthenticatedHomeRedirect />} />
            <Route path="/landing" element={<AuthenticatedHomeRedirect />} />
            <Route path="/theory" element={<AuthenticatedHomeRedirect />} />
            <Route path="/themes" element={<AuthenticatedHomeRedirect />} />
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
            <Route element={<FeedProvider><BooksProvider><Outlet /></BooksProvider></FeedProvider>}>
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
                path="/books/discover"
                element={
                  <ProtectedRoute>
                    <FeatureGateRoute featureKey="books">
                      <SwipeReviewView />
                    </FeatureGateRoute>
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
            <Route path="/dev" element={<Dev />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<SignIn />} />
            <Route path="/login" element={<RedirectWithSearch />} />
            <Route path="/landing" element={<RedirectWithSearch />} />
            <Route path="/theory" element={<RedirectWithSearch />} />
            <Route path="/themes" element={<RedirectWithSearch />} />
            <Route path="/dev" element={<Dev />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      </Router>
    </KeyboardProvider>
  );
}

const QueryProvider = (props) => {
  const children = props?.children;
  if (persistOptions) {
    return (
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        {children}
      </PersistQueryClientProvider>
    );
  }
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

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
