import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ErrorNotificationProvider, useErrorNotification } from './contexts/ErrorNotification';
import ClubProvider from './contexts/Club/ClubProvider';
import { setGlobalErrorHandler } from './services/apiHelpers';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './views/Dashboard';
import Feed from './views/Feed';
import ClubView from './views/ClubView';
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
import FeatureGateRoute from 'components/FeatureGateRoute';
import TutorialProvider from 'contexts/Tutorial/TutorialProvider';
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

  return (
    <Router>
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
          element={(
            <ClubProvider>
              <Dev />
            </ClubProvider>
          )}
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
                <ClubProvider>
                  <NoClub />
                </ClubProvider>
              }
            />
            <Route
              path="/setup/create-club"
              element={
                <ClubProvider>
                  <ClubSetup />
                </ClubProvider>
              }
            />
            <Route
              path="/"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route
              path="/feed"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <Feed />
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route
              path="/club"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <ClubView />
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route
              path="/club/books"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <FeatureGateRoute featureKey="books">
                      <ClubView />
                    </FeatureGateRoute>
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route
              path="/club/goals"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <FeatureGateRoute featureKey="goals">
                      <ClubView />
                    </FeatureGateRoute>
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route
              path="/club/manage"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <ClubManagement />
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route
              path="/books"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <FeatureGateRoute featureKey="books">
                      <Books />
                    </FeatureGateRoute>
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route
              path="/calendar"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <Calendar />
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route
              path="/goals"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <FeatureGateRoute featureKey="goals">
                      <Goals />
                    </FeatureGateRoute>
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route
              path="/profile"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route
              path="/meetings"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <Meetings />
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route
              path="/quotes"
              element={
                <ClubProvider>
                  <ProtectedRoute>
                    <FeatureGateRoute featureKey="quotes">
                      <Quotes />
                    </FeatureGateRoute>
                  </ProtectedRoute>
                </ClubProvider>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/landing" replace />} />
        )}
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ErrorNotificationProvider>
        <TutorialProvider>
          <AppContent />
          <UpdatePrompt />
        </TutorialProvider>
      </ErrorNotificationProvider>
    </AuthProvider>
  );
}

export default App;
